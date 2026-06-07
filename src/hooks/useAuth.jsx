import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured, CLUB_SLUG } from '../lib/supabase.js';
import { highestRole, userHasPerm } from '../lib/permissions.js';
import { applyClubPalette } from '../theme.js';
import { needsTerms } from '../lib/terms.js';
import { isFeatureOn } from '../lib/features.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [guest, setGuest] = useState(null);          // v0.8.0: guests row if this auth user is a guest
  const [club, setClub] = useState(null);
  const [role, setRole] = useState(null);            // 'super_admin' | 'club_manager' | 'club_admin' | null
  const [permissions, setPermissions] = useState({}); // jsonb perm flags (club_admin only)
  const [loading, setLoading] = useState(true);
  // v0.16.1 — surface club-load failures (audit round 2). Previously the
  // load() effect silently returned on error, so a bad slug, an RLS
  // mismatch, or a network blip left `club=null` indefinitely while
  // the rest of the app waited on it — UI stuck on "Loading..." with
  // no signal what went wrong. Now we capture the error so the
  // ErrorBoundary / top-level renderer can show a meaningful state.
  const [clubError, setClubError] = useState(null);

  // Load the club row (everyone needs it to scope queries by club_id).
  // Subscribed in realtime so branding edits from Club Settings push
  // immediately to every open session — including the manager editing.
  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('slug', CLUB_SLUG)
        .single();
      if (cancelled) return;
      if (error) {
        // Don't leave the app in limbo. Log + surface; the consumer
        // can branch on `clubError` to show a recoverable error UI
        // ("Couldn't reach your club — check your connection") rather
        // than spinning forever. Common causes: bad slug (typo in URL
        // / wrong subdomain), RLS policy preventing anon read, network
        // failure, Supabase project paused.
        console.error('[useAuth] club load failed for slug=' + CLUB_SLUG, error);
        setClubError(error);
        return;
      }
      setClubError(null);
      setClub(data);
      applyClubPalette(data);
    };
    load();

    const channel = supabase
      .channel(`clubs:${CLUB_SLUG}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clubs', filter: `slug=eq.${CLUB_SLUG}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Hydrate member + role + permissions whenever session changes.
  // hydrateMember() is also exposed via context as `refreshMember()` so
  // screens that mutate the member row (e.g. TermsGate after accepting,
  // future profile-edit screens) can pull the fresh state back in
  // without a page reload.
  const hydrateMember = async () => {
    if (!isConfigured || !session?.user || !club) {
      setMember(null);
      setGuest(null);
      setRole(null);
      setPermissions({});
      return;
    }
    let { data: m } = await supabase
      .from('members')
      .select('*')
      .eq('club_id', club.id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    // If no member row is linked yet, try to claim a pending one with the
    // matching email (set up by staff via "Add Member" or CSV import).
    if (!m) {
      const { data: claimed } = await supabase.rpc('claim_member_by_email', { p_club_id: club.id });
      if (claimed) {
        const refetch = await supabase
          .from('members')
          .select('*')
          .eq('id', claimed)
          .maybeSingle();
        m = refetch.data;
      }
    }

    // v0.8.0 / v0.8.2: if no member row was found, check whether this
    // auth user has a guest row. A given auth.users row is either in
    // members OR in guests, never both — this is the "what kind of
    // user is this?" branch point. RLS on guests restricts SELECT to
    // the row's own user_id == auth.uid().
    //
    // v0.8.2: if no guest row matches user_id either, this is likely
    // a fresh magic-link click — the guests row was written at
    // registration time with user_id=NULL and needs linking. Call
    // the guest-link Edge Function to do the link server-side via
    // service role, then re-query. Limit to ONE retry to avoid loops.
    let g = null;
    if (!m) {
      const { data: gRow } = await supabase
        .from('guests')
        .select('*')
        .eq('club_id', club.id)
        .eq('user_id', session.user.id)
        .maybeSingle();
      g = gRow || null;

      if (!g) {
        try {
          await supabase.functions.invoke('guest-link');
          const { data: gRow2 } = await supabase
            .from('guests')
            .select('*')
            .eq('club_id', club.id)
            .eq('user_id', session.user.id)
            .maybeSingle();
          g = gRow2 || null;
        } catch (e) {
          console.warn('[guest-link] failed (non-fatal):', e?.message);
        }
      }
    }

    // user_roles: match this club OR platform-wide (null club_id) for super_admin.
    // A user can hold up to two rows here (e.g. super_admin + a club-scoped admin role).
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role, permissions')
      .eq('user_id', session.user.id)
      .or(`club_id.eq.${club.id},club_id.is.null`);

    const top = highestRole(roleRows);
    // Use club_admin perms if present; manager/super_admin have all perms implicitly.
    const adminRow = (roleRows || []).find(r => r.role === 'club_admin');
    setMember(m || null);
    setGuest(g);
    setRole(top);
    setPermissions(adminRow?.permissions || {});
  };

  useEffect(() => { hydrateMember(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [session, club]);

  const signIn = async (email, password) => {
    if (!isConfigured) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email, password, name) => {
    if (!isConfigured) return { error: { message: 'Supabase not configured' } };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!isConfigured) return;
    await supabase.auth.signOut();
  };

  // Derived flags for convenience
  const isSuperAdmin = role === 'super_admin';
  const isManager    = isSuperAdmin || role === 'club_manager';
  const isClubAdmin  = isManager || role === 'club_admin';
  const isAdmin      = isClubAdmin; // back-compat alias — any elevated role
  const hasPerm      = (key) => userHasPerm(role, permissions, key);
  // v0.8.0: guest is a real but limited role. Active means status='active'
  // AND (expires_at is null OR expires_at > now()). Staff who happen to
  // also have a guests row (unusual but possible during testing) keep
  // their staff role; isGuest is false when isAdmin is true.
  const isGuest = !!guest && !isAdmin && !member && guest.status === 'active'
    && (!guest.expires_at || new Date(guest.expires_at) > new Date());
  // Guest access level surfaces what the renderer should show
  // (data_only / read_only / full_temporary). Null when not a guest.
  const guestAccessLevel = isGuest ? (guest.access_level || 'read_only') : null;

  // Pending-member gating. Manager sets clubs.pending_member_access to
  // 'read_only' (default — browse but no writes), 'full' (no gating), or
  // 'locked' (splash screen only). Staff are never gated.
  const isPending     = member?.status === 'pending' && !isAdmin;
  const pendingAccess = club?.pending_member_access || 'read_only';
  const isPendingLocked    = isPending && pendingAccess === 'locked';
  const canMemberWrite     = !isPending || pendingAccess === 'full';

  // Display mode (v0.6.4): apply the member's saved choice to the
  // <html> data-theme attribute so CSS vars in index.css swap in.
  // Honored only when the club has enabled the display_mode flag —
  // otherwise we force 'medium' so a member who set their preference
  // before the club disabled the feature doesn't see a half-broken
  // theme. SSR-safe (skips when document isn't defined).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const allowed = isFeatureOn(club, 'display_mode');
    const mode = allowed ? (member?.display_mode || 'medium') : 'medium';
    document.documentElement.setAttribute('data-theme', mode);
  }, [member?.display_mode, club?.feature_flags, club?.subscription_tier]);

  // Terms of use gating. Member needs to accept the current ToU version
  // before any in-app screen is shown. We only gate when we have a real
  // member row — orphan-session edge cases fall through to whatever
  // other handling exists (typically the pending-locked splash or a
  // blank app boot). Staff are gated too — consistency over carve-outs.
  const needsTermsAcceptance = needsTerms(member);

  return (
    <AuthCtx.Provider value={{
      session, member, guest, club, clubError, role, permissions,
      isSuperAdmin, isManager, isClubAdmin, isAdmin,
      isGuest, guestAccessLevel,
      hasPerm,
      isPending, pendingAccess, isPendingLocked, canMemberWrite,
      needsTermsAcceptance, refreshMember: hydrateMember,
      loading, signIn, signUp, signOut, isConfigured,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured, CLUB_SLUG } from '../lib/supabase.js';
import { highestRole, userHasPerm } from '../lib/permissions.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [club, setClub] = useState(null);
  const [role, setRole] = useState(null);            // 'super_admin' | 'club_manager' | 'club_admin' | null
  const [permissions, setPermissions] = useState({}); // jsonb perm flags (club_admin only)
  const [loading, setLoading] = useState(true);

  // Load the club row (everyone needs it to scope queries by club_id)
  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('slug', CLUB_SLUG)
        .single();
      if (!error) setClub(data);
    })();
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

  // Hydrate member + role + permissions whenever session changes
  useEffect(() => {
    if (!isConfigured || !session?.user || !club) {
      setMember(null);
      setRole(null);
      setPermissions({});
      return;
    }
    (async () => {
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
      setRole(top);
      setPermissions(adminRow?.permissions || {});
    })();
  }, [session, club]);

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

  return (
    <AuthCtx.Provider value={{
      session, member, club, role, permissions,
      isSuperAdmin, isManager, isClubAdmin, isAdmin,
      hasPerm,
      loading, signIn, signUp, signOut, isConfigured,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

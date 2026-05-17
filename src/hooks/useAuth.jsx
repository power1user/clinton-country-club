import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured, CLUB_SLUG } from '../lib/supabase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [club, setClub] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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

  // Hydrate member + admin flags whenever session changes
  useEffect(() => {
    if (!isConfigured || !session?.user || !club) {
      setMember(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
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

      const { data: a } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('club_id', club.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      setMember(m || null);
      setIsAdmin(Boolean(a));
      setIsSuperAdmin(a?.role === 'admin');
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

  return (
    <AuthCtx.Provider value={{ session, member, club, isAdmin, isSuperAdmin, loading, signIn, signUp, signOut, isConfigured }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

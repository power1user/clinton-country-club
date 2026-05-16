import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured, CLUB_SLUG } from '../lib/supabase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [club, setClub] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
      return;
    }
    (async () => {
      const [{ data: m }, { data: a }] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .eq('club_id', club.id)
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('admin_users')
          .select('id')
          .eq('club_id', club.id)
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ]);
      setMember(m || null);
      setIsAdmin(Boolean(a));
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
    <AuthCtx.Provider value={{ session, member, club, isAdmin, loading, signIn, signUp, signOut, isConfigured }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

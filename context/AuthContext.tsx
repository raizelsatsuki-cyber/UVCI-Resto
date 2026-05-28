import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getProfile, ensureProfile } from '../lib/services/profileService';
import { isUVCIEmail, signOut } from '../lib/services/authService';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  /** Email non-UVCI détecté après connexion Google */
  unauthorizedEmail: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]                       = useState<SupabaseUser | null>(null);
  const [profile, setProfile]                 = useState<Profile | null>(null);
  const [session, setSession]                 = useState<Session | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [unauthorizedEmail, setUnauthorized]  = useState(false);

  const loadProfile = useCallback(async (authUser: SupabaseUser) => {
    // Double vérification domaine : côté client (rapide)
    if (!isUVCIEmail(authUser.email)) {
      setUnauthorized(true);
      await signOut(); // déconnecte immédiatement
      return;
    }
    setUnauthorized(false);
    try {
      let p = await getProfile(authUser.id);
      if (!p) p = await ensureProfile(authUser.id, authUser.email ?? '');
      setProfile(p);
    } catch (err) {
      console.error('Erreur profil:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user).finally(() => { if (mounted) setLoading(false); });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadProfile(s.user);
        } else {
          setProfile(null);
          setUnauthorized(false);
        }
        setLoading(false);
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      isAdmin: profile?.role === 'admin',
      unauthorizedEmail,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};

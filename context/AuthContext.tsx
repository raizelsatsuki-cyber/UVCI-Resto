import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getProfile, ensureProfile } from '../lib/services/profileService';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  /** Utilisateur Supabase Auth (null si non connecté) */
  user: SupabaseUser | null;
  /** Profil complet depuis public.profiles */
  profile: Profile | null;
  /** Session active */
  session: Session | null;
  /** Chargement initial en cours */
  loading: boolean;
  /** true si l'utilisateur est admin */
  isAdmin: boolean;
  /** Recharge le profil depuis la DB */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      let p = await getProfile(authUser.id);
      // Si le trigger n'a pas encore créé le profil, on le crée manuellement
      if (!p) p = await ensureProfile(authUser.id, authUser.email ?? '');
      setProfile(p);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    // Charge la session initiale
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user).finally(() => { if (mounted) setLoading(false); });
      else setLoading(false);
    });

    // Écoute les changements d'état Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadProfile(s.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};

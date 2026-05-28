import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import type { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getProfile, ensureProfile } from '../lib/services/profileService';
import { isUVCIEmail } from '../lib/services/authService';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  unauthorizedEmail: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]             = useState<SupabaseUser | null>(null);
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [session, setSession]       = useState<Session | null>(null);
  const [loading, setLoading]       = useState(true);
  const [unauthorized, setUnauth]   = useState(false);

  // FIX 1 : ref pour suivre si le composant est monté — évite les setState sur un composant démonté
  const mountedRef = useRef(true);

  // FIX 2 : ref pour éviter les doubles chargements de profil simultanés
  const profileLoadingRef = useRef(false);

  // FIX 3 : signOut via ref pour ne pas le mettre dans les deps de useEffect
  const signOutRef = useRef(async () => {
    await supabase.auth.signOut();
  });

  const loadProfile = useCallback(async (authUser: SupabaseUser) => {
    // Empêche les appels simultanés
    if (profileLoadingRef.current) return;
    profileLoadingRef.current = true;

    try {
      // Vérification domaine UVCI
      if (!isUVCIEmail(authUser.email)) {
        if (mountedRef.current) setUnauth(true);
        // Déconnexion via ref — ne déclenche PAS de re-render de useEffect
        await signOutRef.current();
        return;
      }

      if (mountedRef.current) setUnauth(false);

      let p = await getProfile(authUser.id);
      if (!p) p = await ensureProfile(authUser.id, authUser.email ?? '');
      if (mountedRef.current) setProfile(p);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      profileLoadingRef.current = false;
    }
  }, []); // deps vides — stable, jamais recréé

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    mountedRef.current = true;

    // FIX 4 : onAuthStateChange SEUL gère tout — plus de getSession() séparé
    // Supabase émet INITIAL_SESSION au montage avec la session existante
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, s: Session | null) => {
        if (!mountedRef.current) return;

        // FIX 5 : ignorer TOKEN_REFRESHED pour éviter les re-chargements inutiles
        if (event === 'TOKEN_REFRESHED') return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await loadProfile(s.user);
        } else {
          setProfile(null);
          // Ne pas remettre unauthorized à false ici — c'est géré dans loadProfile
          if (event === 'SIGNED_OUT') setUnauth(false);
        }

        // Loading terminé après le premier event (INITIAL_SESSION ou SIGNED_IN)
        if (mountedRef.current) setLoading(false);
      }
    );

    // FIX 6 : timeout de sécurité — si Supabase ne répond pas en 4s, on arrête le loading
    const timeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('Auth timeout — Supabase ne répond pas');
        setLoading(false);
      }
    }, 4000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // FIX 7 : deps vides — l'effect ne s'exécute QU'UNE SEULE FOIS

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      isAdmin: profile?.role === 'admin',
      unauthorizedEmail: unauthorized,
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

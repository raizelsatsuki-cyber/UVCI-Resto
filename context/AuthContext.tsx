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
  const [user, setUser]           = useState<SupabaseUser | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [session, setSession]     = useState<Session | null>(null);
  const [loading, setLoading]     = useState(true);
  const [unauthorized, setUnauth] = useState(false);

  const mountedRef        = useRef(true);
  const profileLoadingRef = useRef(false);
  const loadingDoneRef    = useRef(false); // ← garantit que setLoading(false) n'est appelé qu'une fois

  const signOutRef = useRef(async () => { await supabase.auth.signOut(); });

  /** Toujours appeler via stopLoading() — jamais setLoading(false) directement */
  const stopLoading = useCallback(() => {
    if (loadingDoneRef.current) return;
    loadingDoneRef.current = true;
    if (mountedRef.current) setLoading(false);
  }, []);

  const loadProfile = useCallback(async (authUser: SupabaseUser) => {
    if (profileLoadingRef.current) return;
    profileLoadingRef.current = true;
    try {
      if (!isUVCIEmail(authUser.email)) {
        if (mountedRef.current) setUnauth(true);
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
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    mountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, s: Session | null) => {
        if (!mountedRef.current) return;

        // TOKEN_REFRESHED ne change pas l'état de l'utilisateur
        // mais on doit quand même stopper le loading si c'est le 1er event
        if (event === 'TOKEN_REFRESHED') {
          stopLoading(); // ← FIX PRINCIPAL : était "return" sans stopLoading()
          return;
        }

        try {
          setSession(s);
          setUser(s?.user ?? null);

          if (s?.user) {
            await loadProfile(s.user);
          } else {
            setProfile(null);
            if (event === 'SIGNED_OUT') setUnauth(false);
          }
        } catch (err) {
          console.error('onAuthStateChange error:', err);
        } finally {
          stopLoading(); // ← toujours appelé, quoi qu'il arrive
        }
      }
    );

    // Timeout de sécurité réduit à 2s (était 4s)
    const timeout = setTimeout(() => {
      console.warn('Auth timeout — forçage loading=false');
      stopLoading();
    }, 2000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [loadProfile, stopLoading]);

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

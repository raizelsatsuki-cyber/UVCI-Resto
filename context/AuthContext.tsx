import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  /**
   * refreshProfile :
   * - Sans argument → refetch complet depuis la base (bypassCache=true)
   * - Avec optimisticUpdates → applique les nouvelles valeurs immédiatement
   *   dans le state local, PUIS sync la base en arrière-plan (bypassCache=true)
   */
  refreshProfile: (optimisticUpdates?: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]           = useState<SupabaseUser | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [session, setSession]     = useState<Session | null>(null);
  const [loading, setLoading]     = useState(true);
  const [unauthorized, setUnauth] = useState(false);

  const mountedRef = useRef(true);

  /* ── Chargement du profil depuis la base ──────────────────── */
  const loadProfile = useCallback(async (authUser: SupabaseUser): Promise<void> => {
    if (!isUVCIEmail(authUser.email)) {
      if (mountedRef.current) { setUnauth(true); setProfile(null); }
      await supabase.auth.signOut();
      return;
    }
    if (mountedRef.current) setUnauth(false);
    try {
      // bypassCache=true : on veut toujours la donnée fraîche au login
      let p = await getProfile(authUser.id, true);
      if (!p) p = await ensureProfile(authUser.id, authUser.email ?? '');
      if (mountedRef.current) setProfile(p);
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  }, []);

  /* ── refreshProfile ───────────────────────────────────────── */
  const refreshProfile = useCallback(async (optimisticUpdates?: Partial<Profile>) => {
    if (!user) return;

    if (optimisticUpdates) {
      // 1. Mise à jour locale immédiate → UI réactive à 0ms
      if (mountedRef.current) {
        setProfile(prev => prev ? { ...prev, ...optimisticUpdates } : prev);
      }
      // 2. Sync arrière-plan avec bypassCache=true pour lire la vraie valeur en base
      //    Petit délai pour laisser Postgres propager l'écriture
      setTimeout(() => {
        getProfile(user.id, true).then(fresh => {
          if (fresh && mountedRef.current) setProfile(fresh);
        }).catch(console.error);
      }, 400);
    } else {
      // Refetch complet (login, déconnexion, etc.)
      await loadProfile(user);
    }
  }, [user, loadProfile]);

  /* ── Abonnement auth ──────────────────────────────────────── */
  useEffect(() => {
    mountedRef.current = true;
    let resolved = false;

    const resolve = () => {
      if (!resolved && mountedRef.current) {
        resolved = true;
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, s: Session | null) => {
        if (!mountedRef.current) return;
        if (event === 'TOKEN_REFRESHED') { resolve(); return; }

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await loadProfile(s.user);
        } else {
          if (mountedRef.current) {
            setProfile(null);
            if (event === 'SIGNED_OUT') setUnauth(false);
          }
        }
        resolve();
      }
    );

    const timeout = setTimeout(() => {
      console.warn('Auth timeout — forçage loading=false');
      resolve();
    }, 3000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
      resolved = true;
    };
  }, [loadProfile]);

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

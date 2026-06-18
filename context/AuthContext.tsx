import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import type { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase }                from '../lib/supabaseClient';
import { getProfile, ensureProfile } from '../lib/services/profileService';
import { isUVCIEmail }             from '../lib/services/authService';
import type { Database }           from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user:              SupabaseUser | null;
  profile:           Profile | null;
  session:           Session | null;
  loading:           boolean;   // session Supabase pas encore résolue
  isAdmin:           boolean;
  unauthorizedEmail: boolean;
  /**
   * refreshProfile() — deux modes :
   *  - sans arg  → refetch depuis la base (bypassCache=true)
   *  - avec arg  → mise à jour optimiste locale, sync DB en arrière-plan
   *                NE MODIFIE PAS profileLoading → pas de re-render global
   */
  refreshProfile: (optimisticUpdates?: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,      setUser]    = useState<SupabaseUser | null>(null);
  const [profile,   setProfile] = useState<Profile | null>(null);
  const [session,   setSession] = useState<Session | null>(null);
  const [loading,   setLoading] = useState(true);
  const [unauthorized, setUnauth] = useState(false);

  const mountedRef = useRef(true);

  /* ── loadProfile : charge depuis Supabase ──────────────────── */
  const loadProfile = useCallback(async (authUser: SupabaseUser): Promise<void> => {
    if (!isUVCIEmail(authUser.email)) {
      if (mountedRef.current) { setUnauth(true); setProfile(null); }
      await supabase.auth.signOut();
      return;
    }
    if (mountedRef.current) setUnauth(false);
    try {
      let p = await getProfile(authUser.id, true);
      if (!p) p = await ensureProfile(authUser.id, authUser.email ?? '');
      if (mountedRef.current) setProfile(p);
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  }, []);

  /* ── refreshProfile ────────────────────────────────────────────
   * RÈGLE CLÉ : ne JAMAIS toucher loading / profileLoading ici.
   * Modifier loading déclenche un re-render d'AppContent et de
   * tous les useEffect qui en dépendent → boucle infinie assurée.
   * ─────────────────────────────────────────────────────────── */
  const refreshProfile = useCallback(async (optimisticUpdates?: Partial<Profile>) => {
    if (!user) return;
    if (optimisticUpdates) {
      // Mise à jour locale immédiate — 0 requête réseau bloquante
      if (mountedRef.current) {
        setProfile(prev => prev ? { ...prev, ...optimisticUpdates } : prev);
      }
      // Sync silencieuse en arrière-plan après 400ms (laisse Postgres propager)
      // On utilise une ref de l'id pour éviter la fermeture stale sur `user`
      const uid = user.id;
      setTimeout(() => {
        getProfile(uid, true).then(fresh => {
          if (fresh && mountedRef.current) setProfile(fresh);
        }).catch(console.error);
      }, 400);
    } else {
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
        // TOKEN_REFRESHED : pas besoin de recharger le profil
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

    // Filet de sécurité 1.5s : si Supabase ne répond pas
    const timeout = setTimeout(() => {
      console.warn('Auth timeout (1.5s) → loading=false forcé');
      resolve();
    }, 1500);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
      resolved = true;
    };
  }, [loadProfile]);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      isAdmin,
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

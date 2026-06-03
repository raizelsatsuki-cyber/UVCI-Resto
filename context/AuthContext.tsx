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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauth] = useState(false);

  const mountedRef = useRef(true);

  // ── Chargement du profil ─────────────────────────────────────
  // Pas de ref "profileLoading" : si deux appels arrivent en même temps,
  // le deuxième écrase le premier — c'est acceptable et évite les deadlocks.
  const loadProfile = useCallback(async (authUser: SupabaseUser): Promise<void> => {
    if (!isUVCIEmail(authUser.email)) {
      if (mountedRef.current) { setUnauth(true); setProfile(null); }
      await supabase.auth.signOut();
      return;
    }
    if (mountedRef.current) setUnauth(false);
    try {
      let p = await getProfile(authUser.id);
      if (!p) p = await ensureProfile(authUser.id, authUser.email ?? '');
      if (mountedRef.current) setProfile(p);
    } catch (err) {
      console.error('loadProfile error:', err);
      // Ne pas bloquer : on laisse l'UI se rendre même sans profil
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user);
  }, [user, loadProfile]);

  // ── Abonnement auth ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let resolved = false; // garantit setLoading(false) exactement une fois par montage

    const resolve = () => {
      if (!resolved && mountedRef.current) {
        resolved = true;
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, s: Session | null) => {
        if (!mountedRef.current) return;

        // TOKEN_REFRESHED : session rafraîchie en arrière-plan, rien à changer
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

        resolve(); // débloque le loading après le premier event traité
      }
    );

    // Filet de sécurité : si Supabase ne répond pas en 3s on débloque quand même
    const timeout = setTimeout(() => {
      console.warn('Auth timeout — forçage loading=false');
      resolve();
    }, 3000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
      resolved = true; // empêche resolve() après démontage
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

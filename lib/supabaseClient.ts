import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables d'environnement Vite (préfixe VITE_ requis)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let client: any;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn("Erreur d'initialisation Supabase, passage en mode Mock.", err);
  }
}

// Si le client n'a pas été initialisé (clés absentes ou invalides) → mode démo
if (!client || !client.auth) {
  console.warn("⚠️ Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes : mode DÉMO actif.");

  const mockError = { message: "Mode Démo : pas de connexion DB réelle." };
  const mockAsyncError = async () => ({ data: null, error: mockError });

  // Stockage des listeners pour simuler onAuthStateChange
  let authChangeCallbacks: Array<(event: string, session: any) => void> = [];
  let currentMockSession: any = null;

  client = {
    auth: {
      getSession: async () => ({ data: { session: currentMockSession }, error: null }),
      getUser: async () => ({
        data: { user: currentMockSession?.user ?? null },
        error: currentMockSession ? null : { message: 'Not authenticated' }
      }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authChangeCallbacks.push(callback);
        return { data: { subscription: { unsubscribe: () => {
          authChangeCallbacks = authChangeCallbacks.filter(cb => cb !== callback);
        } } } };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        console.log(`[Demo Auth] Connexion simulée pour ${email}`);
        const session = {
          access_token: 'fake-jwt-token',
          user: { id: 'demo-user-id', email }
        };
        currentMockSession = session;
        // Notifier tous les listeners
        setTimeout(() => {
          authChangeCallbacks.forEach(cb => cb('SIGNED_IN', session));
        }, 0);
        return {
          data: { user: { id: 'demo-user-id', email }, session },
          error: null
        };
      },
      signUp: async ({ email }: { email: string }) => ({
        data: {
          user: { id: 'demo-signup-id', email },
          session: null
        },
        error: null
      }),
      signOut: async () => {
        currentMockSession = null;
        setTimeout(() => {
          authChangeCallbacks.forEach(cb => cb('SIGNED_OUT', null));
        }, 0);
        return { error: null };
      },
    },
    from: () => {
      const q: any = {
        select: () => q,
        insert: () => q,
        update: () => q,
        upsert: () => q,
        delete: () => q,
        eq: () => q,
        order: () => q,
        single: mockAsyncError,
        then: (resolve: any) => resolve({ data: null, error: mockError })
      };
      return q;
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {}
  };
}

export const supabase = client as SupabaseClient;

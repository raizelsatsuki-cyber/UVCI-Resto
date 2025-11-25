
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Utilisation des variables d'environnement, avec repli sur les clés fournies pour garantir le fonctionnement du prototype
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dvifigrhzyzrsxvvnawj.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2aWZpZ3Joenl6cnN4dnZuYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTUyNTAsImV4cCI6MjA3OTM5MTI1MH0.aXpczLruzrjpYspqV94xX9Y7agw_6CKzvAaSVaQvMzM";

let client: any;

// Vérification de base pour éviter le crash si les chaînes sont vides
if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    // --- MODE PRODUCTION / CONNECTÉ ---
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn("Erreur d'initialisation du client Supabase, passage en mode Mock.", err);
    // Le client sera écrasé par le mock ci-dessous si l'init échoue
  }
}

// Si le client n'a pas été initialisé correctement (clés invalides ou absentes), on active le Mock
if (!client || !client.auth) {
  // --- MODE DÉMO / PROTOTYPE ---
  console.warn("⚠️ Impossible de se connecter à Supabase : L'application tourne en MODE DÉMO.");

  const mockError = { message: "Mode Démo: Pas de connexion DB réelle." };
  
  // Fonction utilitaire pour simuler une réponse async d'erreur
  const mockAsyncError = async () => ({ data: null, error: mockError });

  client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async ({ email }: { email: string }) => {
        console.log(`[Demo Auth] Connexion simulée pour ${email}`);
        return { 
          data: { 
            user: { id: 'demo-user-id', email: email }, 
            session: { access_token: 'fake-jwt-token', user: { id: 'demo-user-id', email } } 
          }, 
          error: null 
        };
      },
      signUp: async ({ email }: { email: string }) => {
         return { 
          data: { 
            user: { id: 'demo-user-id', email: email }, 
            session: { access_token: 'fake-jwt-token' } 
          }, 
          error: null 
        };
      },
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => {
        const queryBuilder = {
            select: () => queryBuilder,
            insert: () => queryBuilder,
            update: () => queryBuilder,
            delete: () => queryBuilder,
            eq: () => queryBuilder,
            order: () => queryBuilder,
            single: mockAsyncError,
            then: (resolve: any) => resolve({ data: null, error: mockError }) 
        };
        return queryBuilder;
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} })
    }),
    removeChannel: () => {}
  };
}

export const supabase = client as SupabaseClient;

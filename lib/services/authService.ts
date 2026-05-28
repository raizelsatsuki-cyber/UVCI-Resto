import { supabase } from '../supabaseClient';

const ALLOWED_DOMAIN = '@uvci.edu.ci';
const PRODUCTION_URL = 'https://uvci-resto-lordlionels-projects-a8361f43.vercel.app';

/** Retourne l'URL de redirection après OAuth selon l'environnement */
function getRedirectUrl(): string {
  if (typeof window === 'undefined') return PRODUCTION_URL;
  const { protocol, host } = window.location;
  // En local (localhost) on redirige vers localhost, sinon vers Vercel
  return host.includes('localhost')
    ? `${protocol}//${host}`
    : PRODUCTION_URL;
}

/** Connexion via Google OAuth — ouvre la popup Google */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      // Restreindre aux comptes Google du domaine UVCI (Google Workspace)
      queryParams: {
        hd: 'uvci.edu.ci', // hosted domain — n'affiche que les comptes @uvci.edu.ci
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) throw new Error(error.message);
}

/** Déconnexion */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Récupération de la session active */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

/** Vérifie que l'email appartient au domaine UVCI */
export function isUVCIEmail(email: string | undefined | null): boolean {
  return !!email?.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

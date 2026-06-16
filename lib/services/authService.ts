import { supabase } from '../supabaseClient';

const ALLOWED_DOMAIN  = '@uvci.edu.ci';
function getRedirectUrl(): string {
  if (typeof window === 'undefined') return 'https://uvci-resto.vercel.app';
  // FIX 2 : on redirige vers origin + '/#/' pour que le RouterProvider (hash-based)
  // atterrisse sur la page d'accueil après callback OAuth au lieu de '/' sans hash
  // qui pourrait déclencher un re-render avant que le hash soit restauré
  return `${window.location.origin}/#/`;
}

/** Connexion Google OAuth — étudiants */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      queryParams: { hd: 'uvci.edu.ci', access_type: 'offline', prompt: 'select_account' },
    },
  });
  if (error) throw new Error(error.message);
}

/** Connexion email/mot de passe — admin uniquement */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    throw new Error('Accès réservé aux adresses @uvci.edu.ci');
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('invalid login credentials')) throw new Error('Email ou mot de passe incorrect.');
    if (m.includes('email not confirmed')) throw new Error('Confirmez votre email avant de vous connecter.');
    throw new Error(error.message);
  }
}

/** Déconnexion */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Vérifie domaine UVCI */
export function isUVCIEmail(email: string | undefined | null): boolean {
  return !!email?.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

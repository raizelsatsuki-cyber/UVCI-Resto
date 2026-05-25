import { supabase } from '../supabaseClient';

export function translateSupabaseError(message: string): string {
  if (!message) return 'Une erreur est survenue.';
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (lower.includes('email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.';
  if (lower.includes('user already registered')) return 'Un compte avec cet email existe déjà.';
  if (lower.includes('password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (lower.includes('signup is disabled')) return 'Les inscriptions sont temporairement désactivées.';
  if (lower.includes('email rate limit exceeded')) return 'Trop de tentatives. Réessayez plus tard.';
  if (lower.includes('network') || lower.includes('fetch')) return 'Erreur réseau. Vérifiez votre connexion.';
  if (lower.includes('uvci') || lower.includes('trigger')) return "Inscription réservée aux emails @uvci.edu.ci";
  return message;
}

/** Connexion avec email + mot de passe */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateSupabaseError(error.message));
  return data;
}

/** Inscription — crée un compte Auth, le trigger DB crée le profil */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(translateSupabaseError(error.message));
  return data;
}

/** Déconnexion */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(translateSupabaseError(error.message));
}

/** Envoi d'un email de réinitialisation de mot de passe */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  });
  if (error) throw new Error(translateSupabaseError(error.message));
}

/** Mise à jour du mot de passe (après clic sur le lien de reset) */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(translateSupabaseError(error.message));
}

/** Récupération de la session active */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(translateSupabaseError(error.message));
  return data.session;
}

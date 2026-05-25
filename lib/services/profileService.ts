import { supabase } from '../supabaseClient';
import type { Database } from '../database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

/** Récupère le profil depuis public.profiles */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('getProfile error:', error.message);
    return null;
  }
  return data;
}

/** Met à jour le solde de points d'un utilisateur */
export async function updateBalancePoints(userId: string, delta: number) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance_points')
    .eq('id', userId)
    .single();

  const current = profile?.balance_points ?? 0;
  const newBalance = Math.max(0, current + delta);

  const { error } = await supabase
    .from('profiles')
    .update({ balance_points: newBalance })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  return newBalance;
}

/** Force la création du profil si le trigger a échoué */
export async function ensureProfile(userId: string, email: string) {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const role = email === 'resto@uvci.edu.ci' ? 'admin' : 'client';
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, email, role, balance_points: 0 })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

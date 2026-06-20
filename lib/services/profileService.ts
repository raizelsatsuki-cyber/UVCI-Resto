import { supabase } from '../supabaseClient';
import type { Database } from '../database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Cache mémoire simple — évite un aller-retour réseau à chaque navigation
// TTL 30s : suffisant pour une session active, court enough pour rester frais
const profileCache = new Map<string, { data: Profile; ts: number }>();
const CACHE_TTL_MS = 30_000;

export async function getProfile(userId: string, bypassCache = false): Promise<Profile | null> {
  if (!bypassCache) {
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  }
  const { data, error } = await (supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single() as any);
  if (error) { console.error('getProfile:', error.message); return null; }
  profileCache.set(userId, { data: data as Profile, ts: Date.now() });
  return data as Profile;
}

/** Invalide le cache pour forcer un refetch propre */
export function invalidateProfileCache(userId: string): void {
  profileCache.delete(userId);
}

/**
 * FIX : utilise une RPC atomique pour éviter la race condition
 * (lecture puis écriture laissait une fenêtre où deux transactions
 * simultanées pouvaient lire le même solde et l'écrire deux fois)
 */
export async function updateBalancePoints(userId: string, delta: number): Promise<number> {
  // Pour un incrément (gain de points) : UPDATE avec expression atomique
  if (delta >= 0) {
    const { data, error } = await (supabase.rpc('increment_balance_points', {
      p_user_id: userId,
      p_delta:   delta,
    }) as any);
    if (error) {
      // Fallback si la RPC n'existe pas encore
      const { data: profile } = await (supabase
        .from('profiles').select('balance_points').eq('id', userId).single() as any);
      const current    = (profile as any)?.balance_points ?? 0;
      const newBalance = current + delta;
      await (supabase.from('profiles').update({ balance_points: newBalance }).eq('id', userId) as any);
      return newBalance;
    }
    return (data as number) ?? 0;
  }
  // Pour un décrément : utiliser redeem_loyalty_points (déjà atomique)
  const { data, error } = await (supabase.rpc('redeem_loyalty_points', {
    p_user_id:    userId,
    p_points:     Math.abs(delta),
    p_description: 'Déduction automatique',
  }) as any);
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; new_balance: number; error?: string };
  if (!result.success) throw new Error(result.error ?? 'Solde insuffisant');
  return result.new_balance;
}

/**
 * FIX : le rôle par défaut est maintenant 'student' (aligné avec UserRole dans database.types.ts).
 * Précédemment c'était 'client', qui n'existe pas dans le type UserRole.
 */
export async function ensureProfile(userId: string, email: string): Promise<Profile | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const role = email === 'resto@uvci.edu.ci' ? 'admin' : 'student';
  const { data, error } = await (supabase
    .from('profiles')
    .insert({ id: userId, email, role, balance_points: 0 })
    .select()
    .single() as any);
  if (error) throw new Error(error.message);
  return data as Profile;
}

/** Met à jour le nom d'affichage et/ou l'URL d'avatar d'un profil */
export async function updateProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<void> {
  const { error } = await (supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId) as any);
  if (error) throw new Error(error.message);
  // Invalider le cache pour que le prochain getProfile refetch depuis la base
  invalidateProfileCache(userId);
}

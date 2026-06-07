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

export async function updateBalancePoints(userId: string, delta: number): Promise<number> {
  const { data: profile } = await (supabase
    .from('profiles').select('balance_points').eq('id', userId).single() as any);
  const current    = (profile as any)?.balance_points ?? 0;
  const newBalance = Math.max(0, current + delta);
  const { error } = await (supabase
    .from('profiles').update({ balance_points: newBalance }).eq('id', userId) as any);
  if (error) throw new Error(error.message);
  return newBalance;
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

import { supabase } from '../supabaseClient';
import type { Database } from '../database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await (supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single() as any);
  if (error) { console.error('getProfile:', error.message); return null; }
  return data as Profile;
}

export async function updateBalancePoints(userId: string, delta: number) {
  const { data: profile } = await (supabase
    .from('profiles').select('balance_points').eq('id', userId).single() as any);
  const current   = (profile as any)?.balance_points ?? 0;
  const newBalance = Math.max(0, current + delta);
  const { error } = await (supabase
    .from('profiles').update({ balance_points: newBalance }).eq('id', userId) as any);
  if (error) throw new Error(error.message);
  return newBalance;
}

export async function ensureProfile(userId: string, email: string): Promise<Profile | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const role = email === 'resto@uvci.edu.ci' ? 'admin' : 'client';
  const { data, error } = await (supabase
    .from('profiles')
    .insert({ id: userId, email, role, balance_points: 0 })
    .select()
    .single() as any);
  if (error) throw new Error(error.message);
  return data as Profile;
}

import { supabase } from '../supabaseClient';
import type { LoyaltyTransaction } from '../../types/index';

/** Récupère les transactions de fidélité d'un utilisateur */
export async function getLoyaltyTransactions(userId: string): Promise<LoyaltyTransaction[]> {
  const { data, error } = await (supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50) as any);
  if (error) throw new Error(error.message);
  return (data as LoyaltyTransaction[]) ?? [];
}

/** Solde de points d'un utilisateur */
export async function getLoyaltyBalance(userId: string): Promise<number> {
  const { data, error } = await (supabase
    .from('profiles')
    .select('balance_points')
    .eq('id', userId)
    .single() as any);
  if (error) throw new Error(error.message);
  return (data as any)?.balance_points ?? 0;
}

/** Racheter des points via la fonction RPC sécurisée */
export async function redeemPoints(userId: string, points: number, description: string): Promise<number> {
  const { data, error } = await (supabase
    .rpc('redeem_loyalty_points', {
      p_user_id: userId,
      p_points: points,
      p_description: description,
    }) as any);
  if (error) throw new Error(error.message);
  const result = data as any;
  if (!result.success) throw new Error(result.error ?? 'Rachat impossible');
  return result.new_balance as number;
}

import { supabase } from '../supabaseClient';
import type { Order } from '../../types/index';

/** Vérifie un QR token et retourne les infos de la commande */
export async function verifyQRToken(token: string): Promise<Order | null> {
  const { data, error } = await (supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('pickup_qr_token', token)
    .single() as any);
  if (error || !data) return null;
  return data as Order;
}

/** Confirme le retrait : passe la commande à 'completed' et invalide le QR */
export async function confirmPickup(orderId: string): Promise<void> {
  const { error } = await (supabase
    .from('orders')
    .update({ status: 'completed', qr_used: true })
    .eq('id', orderId)
    .eq('qr_used', false) as any);
  if (error) throw new Error(error.message);
}

import { supabase } from '../supabaseClient';
import type { Order } from '../../types/index';

/** Vérifie un QR token et retourne les infos de la commande */
export async function verifyQRToken(token: string): Promise<Order | null> {
  const { data, error } = await (supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('pickup_qr_token' as any, token) // FIX: colonne nouvelle, cast any
    .single() as any);
  if (error || !data) return null;
  return data as Order;
}

/** Confirme le retrait : passe la commande à 'completed' et invalide le QR */
export async function confirmPickup(orderId: string): Promise<void> {
  const { error } = await (supabase
    .from('orders')
    .update({ status: 'completed' as any, qr_used: true as any }) // FIX: nouveaux champs
    .eq('id', orderId)
    .eq('qr_used' as any, false) as any); // FIX
  if (error) throw new Error((error as any).message);
}

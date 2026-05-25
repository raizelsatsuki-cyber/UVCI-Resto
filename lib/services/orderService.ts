import { supabase } from '../supabaseClient';
import { generateWaveLink } from '../waveUtils';
import { decrementStock } from './menuService';
import type { Order, CartItem } from '../../types/index';

/** Récupère toutes les commandes (admin) avec items et noms des plats */
export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Order[]) || [];
}

/** Récupère les commandes d'un utilisateur */
export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Order[]) || [];
}

/** Change le statut d'une commande */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'ready' | 'delivered'
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}

export type ProcessOrderResult = 'success' | 'failed' | 'unauthorized';

/**
 * Crée une commande complète : vérifie l'auth, insère la commande,
 * insère les order_items, décrémente le stock, gère Wave.
 */
export async function processOrder(
  cartItems: CartItem[],
  phoneNumber: string,
  paymentMethod: 'wave' | 'cash',
  totalAmount: number
): Promise<ProcessOrderResult> {
  // 1. Session fraîche
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return 'unauthorized';
  if (cartItems.length === 0) return 'failed';

  try {
    // 2. Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_price: Math.round(totalAmount),
        client_phone: phoneNumber,
        payment_method: paymentMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Erreur création commande:', orderError);
      return 'failed';
    }

    // 3. Insérer les items
    const orderItemsPayload = cartItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item.id,
      quantity: item.quantity,
      price_at_order: item.menu_item.price,
      selected_option: item.selectedOptions
        .map((o) => o.id)
        .filter((id): id is string => Boolean(id)),
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) {
      // Rollback : supprimer la commande orpheline
      await supabase.from('orders').delete().eq('id', order.id);
      console.error('Erreur insertion items:', itemsError);
      return 'failed';
    }

    // 4. Décrémenter le stock de chaque plat
    await Promise.allSettled(
      cartItems.map((item) => decrementStock(item.menu_item.id, item.quantity))
    );

    // 5. Redirection Wave si nécessaire
    if (paymentMethod === 'wave') {
      const waveLink = generateWaveLink(totalAmount);
      window.location.href = waveLink;
    }

    return 'success';
  } catch (err) {
    console.error('Exception processOrder:', err);
    return 'failed';
  }
}

/** Abonnement Realtime sur les commandes (admin) */
export function subscribeToAllOrders(onUpdate: () => void) {
  return supabase
    .channel('orders:all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onUpdate)
    .subscribe();
}

/** Abonnement Realtime sur les commandes d'un utilisateur */
export function subscribeToUserOrders(userId: string, onUpdate: () => void) {
  return supabase
    .channel(`orders:user:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
      onUpdate
    )
    .subscribe();
}

import { supabase } from '../supabaseClient';
import { generateWaveLink } from '../waveUtils';
import { decrementStock } from './menuService';
import type { Order, CartItem } from '../../types/index';

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await (supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .order('created_at', { ascending: false }) as any);
  if (error) throw new Error(error.message);
  return (data as Order[]) ?? [];
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await (supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as any);
  if (error) throw new Error(error.message);
  return (data as Order[]) ?? [];
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'ready' | 'delivered'
): Promise<void> {
  const { error } = await (supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId) as any);
  if (error) throw new Error(error.message);
}

export type ProcessOrderResult = 'success' | 'failed' | 'unauthorized';

export async function processOrder(
  cartItems: CartItem[],
  phoneNumber: string,
  paymentMethod: 'wave' | 'cash',
  totalAmount: number
): Promise<ProcessOrderResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return 'unauthorized';
  if (cartItems.length === 0) return 'failed';

  try {
    const { data: order, error: orderError } = await (supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_price: Math.round(totalAmount),
        client_phone: phoneNumber,
        payment_method: paymentMethod,
        status: 'pending',
      })
      .select()
      .single() as any);

    if (orderError || !order) { console.error(orderError); return 'failed'; }

    const orderItemsPayload = cartItems.map((item) => ({
      order_id: (order as any).id,
      menu_item_id: item.menu_item.id,
      quantity: item.quantity,
      price_at_order: item.menu_item.price,
      selected_option: item.selectedOptions
        .map((o) => o.id)
        .filter((id): id is string => Boolean(id)),
    }));

    const { error: itemsError } = await (supabase.from('order_items').insert(orderItemsPayload) as any);
    if (itemsError) {
      await (supabase.from('orders').delete().eq('id', (order as any).id) as any);
      return 'failed';
    }

    await Promise.allSettled(
      cartItems.map((item) => decrementStock(item.menu_item.id, item.quantity))
    );

    if (paymentMethod === 'wave') {
      window.location.href = generateWaveLink(totalAmount);
    }
    return 'success';
  } catch (err) {
    console.error('processOrder exception:', err);
    return 'failed';
  }
}

export function subscribeToAllOrders(onUpdate: () => void) {
  return supabase
    .channel('orders:all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onUpdate)
    .subscribe();
}

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

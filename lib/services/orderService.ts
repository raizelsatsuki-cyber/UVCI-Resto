import { supabase } from '../supabaseClient';
import { decrementStock, restoreStock } from './menuService';
import type { Order, CartItem } from '../../types/index';

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await (supabase
    .from('orders')
    .select(`
      id, user_id, client_phone, status, total_price,
      payment_method, created_at, pickup_qr_token, qr_used,
      order_items (
        id, quantity, price_at_order,
        menu_items ( name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200) as any);
  if (error) throw new Error(error.message);
  return (data as Order[]) ?? [];
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  // Sélection ciblée : pas de '*' sur order_items pour éviter le surcoût réseau
  const { data, error } = await (supabase
    .from('orders')
    .select(`
      id, status, total_price, payment_method,
      created_at, pickup_qr_token, qr_used,
      order_items (
        id, quantity, price_at_order, selected_option,
        menu_items ( name )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50) as any);                     // limite raisonnable — paginer si besoin
  if (error) throw new Error(error.message);
  return (data as Order[]) ?? [];
}

/**
 * FIX : updateOrderStatus accepte maintenant tous les statuts valides
 * (était limité à 'pending' | 'ready' | 'delivered', manquait 'completed',
 * 'paid', 'preparing', 'cancelled', 'pending_payment').
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled'
): Promise<void> {
  const { error } = await (supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId) as any);
  if (error) throw new Error(error.message);
}

export type ProcessOrderResult =
  | { status: 'success'; orderId: string }
  | { status: 'failed' }
  | { status: 'unauthorized' };

/**
 * FIX 1 : retourne maintenant un objet { status, orderId } au lieu d'une string
 *          pour que CartContext puisse récupérer l'orderId et appeler Wave.
 * FIX 2 : le statut initial est 'pending_payment' pour Wave, 'pending' pour cash.
 * FIX 3 : ne redirige plus directement vers Wave (géré dans CartContext).
 * FIX 4 : price_at_order inclut les options sélectionnées (était juste item.price).
 */
export async function processOrder(
  cartItems: CartItem[],
  phoneNumber: string,
  paymentMethod: 'wave' | 'cash',
  totalAmount: number
): Promise<ProcessOrderResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: 'unauthorized' };
  if (cartItems.length === 0) return { status: 'failed' };

  try {
    const initialStatus = paymentMethod === 'wave' ? 'pending_payment' : 'pending';

    const { data: order, error: orderError } = await (supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_price: Math.round(totalAmount),
        client_phone: phoneNumber,
        payment_method: paymentMethod,
        status: initialStatus,
      })
      .select()
      .single() as any);

    if (orderError || !order) { console.error(orderError); return { status: 'failed' }; }

    const orderItemsPayload = cartItems.map((item) => {
      // FIX 4 : prix unitaire = prix de base + modificateurs d'options
      const optsPrice = item.selectedOptions.reduce((s, o) => s + o.price_modifier, 0);
      return {
        order_id: (order as any).id,
        menu_item_id: item.menu_item.id,
        quantity: item.quantity,
        price_at_order: item.menu_item.price + optsPrice,
        selected_option: item.selectedOptions
          .map((o) => o.id)
          .filter((id): id is string => Boolean(id)),
      };
    });

    const { error: itemsError } = await (supabase
      .from('order_items')
      .insert(orderItemsPayload) as any);

    if (itemsError) {
      // Rollback commande si les items échouent
      await (supabase.from('orders').delete().eq('id', (order as any).id) as any);
      return { status: 'failed' };
    }

    await Promise.allSettled(
      cartItems.map((item) => decrementStock(item.menu_item.id, item.quantity))
    );

    return { status: 'success', orderId: (order as any).id };
  } catch (err) {
    console.error('processOrder exception:', err);
    return { status: 'failed' };
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

/**
 * Annule une commande.
 * - Utilisateur : seulement si statut = 'pending' (règle métier validée)
 * - Admin : tout statut sauf 'completed' et 'delivered'
 * Le stock est restitué via restaureStock dans menuService.
 */
export async function cancelOrder(
  orderId: string,
  isAdmin: boolean = false
): Promise<void> {
  const { data: order, error: fetchError } = await (supabase
    .from('orders')
    .select('status, order_items(menu_item_id, quantity)')
    .eq('id', orderId)
    .single() as any);

  if (fetchError || !order) throw new Error('Commande introuvable');

  const cancellableByUser  = ['pending', 'pending_payment'];
  const cancellableByAdmin = ['pending', 'pending_payment', 'paid', 'preparing', 'ready'];

  const allowed = isAdmin ? cancellableByAdmin : cancellableByUser;
  if (!allowed.includes((order as any).status)) {
    throw new Error(
      isAdmin
        ? 'Cette commande ne peut plus être annulée.'
        : 'Vous ne pouvez annuler une commande qu\'avant sa préparation.'
    );
  }

  const { error } = await (supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId) as any);
  if (error) throw new Error(error.message);

  // Restituer le stock pour chaque article
  const items = (order as any).order_items ?? [];
  await Promise.allSettled(
    items.map((item: { menu_item_id: string; quantity: number }) =>
      restoreStock(item.menu_item_id, item.quantity)
    )
  );
}

// ─── Fonctions requises par /payment/page.tsx ─────────────────────────────────
// Bug 8 fix : ces deux fonctions manquaient — la page de vérification
// importait getOrderPaymentStatus et subscribeToOrderPayment qui n'existaient pas.

/** Polling : récupère le statut de paiement d'une commande */
export async function getOrderPaymentStatus(
  orderId: string,
): Promise<{ status: string; payment_status: string; transaction_id: string | null } | null> {
  const { data, error } = await (supabase
    .from('orders')
    .select('status, payment_status, wave_transaction_id')
    .eq('id', orderId)
    .single() as any);

  if (error || !data) return null;

  return {
    status:         (data as any).status,
    payment_status: (data as any).payment_status ?? 'unpaid',
    transaction_id: (data as any).wave_transaction_id ?? null,
  };
}

/** Realtime : souscription temps réel sur le statut de paiement d'une commande */
export function subscribeToOrderPayment(
  orderId: string,
  onUpdate: (payload: {
    status: string;
    payment_status: string;
    transaction_id: string | null;
  }) => void,
) {
  return supabase
    .channel(`order:payment:${orderId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        const rec = payload.new as any;
        onUpdate({
          status:         rec.status          ?? 'pending_payment',
          payment_status: rec.payment_status  ?? 'unpaid',
          transaction_id: rec.wave_transaction_id ?? null,
        });
      },
    )
    .subscribe();
}

import { supabase } from '../supabaseClient';

const WAVE_EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wave-checkout`;

export interface WaveCheckoutResult {
  checkoutUrl: string;
  checkoutId: string;
}

/** Crée une session de paiement Wave via l'Edge Function sécurisée */
export async function createWaveCheckout(
  orderId: string,
  amount: number,
  phone: string
): Promise<WaveCheckoutResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await fetch(WAVE_EDGE_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ orderId, amount, phone }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur Wave' }));
    throw new Error((err as any).error ?? 'Erreur création paiement Wave');
  }

  return res.json() as Promise<WaveCheckoutResult>;
}

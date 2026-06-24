import { supabase } from '../supabaseClient';

/**
 * Lien marchand Wave statique fourni par Wave CI.
 * Le paramètre `amount` pré-remplit le montant dans l'app Wave.
 * L'utilisateur confirme manuellement sur Wave.
 *
 * NOTE : sans clé API Wave (wave_sk_prod_...), il n'y a pas de webhook
 * automatique — le statut de la commande devra être mis à jour
 * manuellement par l'admin depuis le dashboard après confirmation.
 * Quand la vraie clé API sera disponible, remplacer par l'Edge Function.
 */
const WAVE_MERCHANT_URL = 'https://pay.wave.com/m/M_ci_Io7SNCTiP_hn/c/ci/';

export interface WaveCheckoutResult {
  checkoutUrl: string;
  checkoutId:  string;
  mode:        'static' | 'api';
}

export async function createWaveCheckout(
  orderId:  string,
  amount:   number,
  phone:    string
): Promise<WaveCheckoutResult> {
  // Marquer la commande comme en attente de paiement
  const { error } = await supabase
    .from('orders')
    .update({
      status:          'pending_payment' as const,
      wave_client_ref: orderId,
    } as any)
    .eq('id', orderId);

  if (error) throw new Error(error.message);

  // Construire l'URL Wave avec le montant pré-rempli
  // Wave accepte ?amount=XXXXX pour pré-remplir le champ montant
  const checkoutUrl = `${WAVE_MERCHANT_URL}?amount=${Math.round(amount)}`;

  return {
    checkoutUrl,
    checkoutId: `static_${orderId}`,
    mode:       'static',
  };
}

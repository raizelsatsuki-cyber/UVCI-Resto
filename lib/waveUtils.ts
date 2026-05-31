/**
 * waveUtils.ts — Utilitaires Wave
 *
 * FIX : generateWaveLink était utilisé dans orderService pour rediriger directement
 * vers un lien Wave statique simulé (https://pay.wave.com/m/M_ci_Io7SNCTiP_hn/c/ci/)
 * sans créer de session de paiement réelle ni associer la commande à la transaction.
 *
 * Ce lien statique est conservé uniquement comme fallback d'affichage
 * (ex. QR code de partage ou lien de secours), mais le flux de paiement
 * passe désormais par l'Edge Function wave-checkout → createWaveCheckout()
 * qui retourne une vraie checkoutUrl Wave avec le montant correct.
 *
 * Ce fichier peut être supprimé si le fallback n'est pas nécessaire.
 */

const WAVE_MERCHANT_BASE = 'https://pay.wave.com/m/M_ci_Io7SNCTiP_hn/c/ci/';

/**
 * Génère un lien de paiement Wave statique (fallback uniquement).
 * NE PAS utiliser dans le flux de commande principal — utiliser createWaveCheckout() à la place.
 */
export const generateWaveLink = (totalAmount: number): string => {
  return `${WAVE_MERCHANT_BASE}?amount=${totalAmount}`;
};

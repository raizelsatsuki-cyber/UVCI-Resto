
/**
 * Génère le lien de paiement Wave avec le montant dynamique.
 * @param totalAmount Le montant total de la commande
 * @returns L'URL de paiement Wave formatée
 */
export const generateWaveLink = (totalAmount: number): string => {
  // ID Marchand et configuration de base (Simulé pour UVCI Resto)
  const baseUrl = "https://pay.wave.com/m/M_ci_Io7SNCTiP_hn/c/ci/";
  
  // Construction du lien
  return `${baseUrl}?amount=${totalAmount}`;
};

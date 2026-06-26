/**
 * Haptic feedback — vibration tactile sur mobile
 * Utilise l'API Vibration (supportée par Android Chrome, pas iOS Safari)
 * Ne lève jamais d'erreur si non supporté.
 */

/** Courte impulsion — ajout au panier, tap sur bouton */
export const hapticLight = (): void => {
  try { navigator.vibrate?.(30); } catch {}
};

/** Double impulsion — confirmation commande, succès */
export const hapticSuccess = (): void => {
  try { navigator.vibrate?.([40, 30, 40]); } catch {}
};

/** Impulsion forte — erreur, annulation */
export const hapticError = (): void => {
  try { navigator.vibrate?.([80, 40, 80]); } catch {}
};

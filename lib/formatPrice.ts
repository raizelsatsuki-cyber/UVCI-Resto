/**
 * Formatter de prix centralisé — UVCI Resto
 * Garantit un format cohérent partout dans l'app.
 *
 * Exemples :
 *   formatPrice(1500)        → "1 500 FCFA"
 *   formatPrice(1500, true)  → "1 500 F"  (compact pour les cartes)
 *   formatPrice(0)           → "Gratuit"
 */
export function formatPrice(amount: number, compact = false): string {
  if (amount === 0) return 'Gratuit';
  const formatted = amount.toLocaleString('fr-FR');
  return compact ? `${formatted} F` : `${formatted} FCFA`;
}

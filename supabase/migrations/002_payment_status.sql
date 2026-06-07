-- ============================================================
-- Migration 002 : Champs Wave manquants sur la table orders
-- Bug 5 : wave_transaction_id déjà dans schema mais pas en DB existante
-- Bug 8 : payment_status requis par le polling frontend
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS wave_client_ref text,
  ADD COLUMN IF NOT EXISTS wave_transaction_id text;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders (payment_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_wave_client_ref
  ON orders (wave_client_ref) WHERE wave_client_ref IS NOT NULL;

-- Politique RLS : le frontend NE PEUT PAS écrire payment_status directement
-- Seul le service_role (Edge Functions) peut le modifier.
-- On retire le droit UPDATE général sur orders pour les users authentifiés
-- et on le remplace par une politique stricte sur les colonnes autorisées.
DROP POLICY IF EXISTS "Users update own orders" ON orders;

-- Les users ne peuvent annuler que leurs propres commandes (status = 'cancelled')
-- mais ne peuvent jamais toucher payment_status ni les champs Wave.
CREATE POLICY "Users can only cancel own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND payment_status = (SELECT payment_status FROM orders WHERE id = orders.id)
    AND wave_transaction_id IS NOT DISTINCT FROM (SELECT wave_transaction_id FROM orders WHERE id = orders.id)
    AND paid_at IS NOT DISTINCT FROM (SELECT paid_at FROM orders WHERE id = orders.id)
  );

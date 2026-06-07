-- ============================================================
-- Migration : Gestion stricte du paiement Wave
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Étendre les statuts de la table orders
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending_payment',
    'paid',
    'pending',
    'ready',
    'delivered',
    'payment_failed',
    'cancelled'
  ));

-- 2. Ajouter les champs de traçabilité du paiement
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status    TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS transaction_id    TEXT,
  ADD COLUMN IF NOT EXISTS paid_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wave_checkout_id  TEXT,
  ADD COLUMN IF NOT EXISTS wave_client_ref   TEXT;

ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'cancelled'));

-- 3. Index pour les lookups de webhook (performance)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_wave_checkout_id ON orders (wave_checkout_id) WHERE wave_checkout_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_wave_client_ref  ON orders (wave_client_ref)  WHERE wave_client_ref IS NOT NULL;
CREATE        INDEX IF NOT EXISTS idx_orders_payment_status   ON orders (payment_status);

-- 4. Table de log des événements de paiement (audit trail complet)
CREATE TABLE IF NOT EXISTS payment_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  wave_data  JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON payment_events (order_id);

-- RLS sur payment_events : lecture admin seulement
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_events_admin_only" ON payment_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE  payment_events IS 'Audit trail de tous les événements de paiement Wave';
COMMENT ON COLUMN orders.payment_status    IS 'Statut du paiement - géré UNIQUEMENT par le backend';
COMMENT ON COLUMN orders.payment_reference IS 'Référence interne unique du paiement';
COMMENT ON COLUMN orders.transaction_id    IS 'ID de transaction Wave retourné par webhook';
COMMENT ON COLUMN orders.paid_at           IS 'Horodatage de confirmation du paiement Wave';
COMMENT ON COLUMN orders.wave_checkout_id  IS 'ID du checkout Wave';
COMMENT ON COLUMN orders.wave_client_ref   IS 'Référence client envoyée à Wave (uuid unique)';

-- ============================================================
-- UVCI Resto — Schéma Supabase complet
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Énumérations ──────────────────────────────────────────────────────────────
CREATE TYPE user_role      AS ENUM ('student', 'staff', 'admin');
CREATE TYPE order_status   AS ENUM (
  'pending_payment', 'pending', 'paid',
  'preparing', 'ready', 'completed', 'delivered', 'cancelled', 'payment_failed'
);
CREATE TYPE payment_method AS ENUM ('wave', 'cash');
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'failed', 'cancelled');
CREATE TYPE loyalty_type   AS ENUM ('earn', 'redeem', 'expire');


-- ── Fonction is_admin() — sans récursion RLS ──────────────────────────────────
-- SECURITY DEFINER : lit la table profiles avec les droits service_role,
-- ce qui court-circuite RLS et évite la boucle infinie.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT        NOT NULL,
  role           user_role   NOT NULL DEFAULT 'student',
  balance_points INTEGER     NOT NULL DEFAULT 0 CHECK (balance_points >= 0),
  display_name   TEXT,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access on profiles"
  ON profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ── Menu Items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  description    TEXT,
  price          INTEGER     NOT NULL CHECK (price >= 0),
  image_url      TEXT,
  category       TEXT        NOT NULL,
  allergens      TEXT[],
  stock_quantity INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available   BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Admin write menu_items"
  ON menu_items FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ── Meal Options ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_options (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id        UUID        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  price_modifier INTEGER     NOT NULL DEFAULT 0,
  is_mandatory   BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meal_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read meal_options" ON meal_options FOR SELECT USING (true);
CREATE POLICY "Admin write meal_options"
  ON meal_options FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  client_phone        TEXT,
  status              order_status   NOT NULL DEFAULT 'pending',
  total_price         INTEGER        NOT NULL CHECK (total_price >= 0),
  payment_method      payment_method NOT NULL,
  payment_status      TEXT           NOT NULL DEFAULT 'unpaid'
                        CHECK (payment_status IN ('unpaid','pending','paid','failed','cancelled')),
  wave_checkout_id    TEXT,
  wave_client_ref     TEXT,
  wave_transaction_id TEXT,
  paid_at             TIMESTAMPTZ,
  pickup_qr_token     TEXT           UNIQUE,
  qr_used             BOOLEAN        NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_wave_client_ref
  ON orders (wave_client_ref) WHERE wave_client_ref IS NOT NULL;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only cancel own orders"
  ON orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND payment_status = (SELECT payment_status FROM orders WHERE id = orders.id)
    AND wave_transaction_id IS NOT DISTINCT FROM (SELECT wave_transaction_id FROM orders WHERE id = orders.id)
    AND paid_at IS NOT DISTINCT FROM (SELECT paid_at FROM orders WHERE id = orders.id)
  );
CREATE POLICY "Admin full access on orders"
  ON orders FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ── Order Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID        NOT NULL REFERENCES menu_items(id),
  quantity        INTEGER     NOT NULL CHECK (quantity > 0),
  price_at_order  INTEGER,
  selected_option TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order_items"
  ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );
CREATE POLICY "Users insert own order_items"
  ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );
CREATE POLICY "Admin full access on order_items"
  ON order_items FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ── Loyalty Transactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id         UUID         REFERENCES orders(id) ON DELETE SET NULL,
  points           INTEGER      NOT NULL,
  transaction_type loyalty_type NOT NULL,
  description      TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own loyalty"
  ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin full access on loyalty"
  ON loyalty_transactions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ── Push Subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth_key   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push_subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);


-- ── RPC : rachat de points fidélité ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_user_id     UUID,
  p_points      INTEGER,
  p_description TEXT
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance_points INTO v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profil introuvable');
  END IF;
  IF v_balance < p_points THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant');
  END IF;
  UPDATE profiles SET balance_points = balance_points - p_points WHERE id = p_user_id;
  INSERT INTO loyalty_transactions(user_id, points, transaction_type, description)
    VALUES (p_user_id, -p_points, 'redeem', p_description);
  RETURN json_build_object('success', true, 'new_balance', v_balance - p_points);
END;
$$;

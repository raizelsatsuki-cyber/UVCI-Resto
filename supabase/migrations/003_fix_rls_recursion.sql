-- ============================================================
-- Migration 003 : Correction boucle infinie RLS (profiles)
-- Erreur : "infinite recursion detected in policy for relation profiles"
--
-- Cause : les politiques admin faisaient SELECT sur la table profiles
-- pour vérifier si l'utilisateur est admin... ce qui re-déclenchait
-- les mêmes politiques → boucle infinie.
--
-- Solution : une fonction is_admin() avec SECURITY DEFINER qui
-- contourne le RLS pour lire le rôle sans récursion.
-- ============================================================


-- ── ÉTAPE 1 : Supprimer toutes les anciennes politiques récursives ────────────

DROP POLICY IF EXISTS "Admin full access on profiles"    ON profiles;
DROP POLICY IF EXISTS "Admin write menu_items"           ON menu_items;
DROP POLICY IF EXISTS "Admin write meal_options"         ON meal_options;
DROP POLICY IF EXISTS "Admin full access on orders"      ON orders;
DROP POLICY IF EXISTS "Admin full access on order_items" ON order_items;
DROP POLICY IF EXISTS "Admin full access on loyalty"     ON loyalty_transactions;


-- ── ÉTAPE 2 : Créer la fonction is_admin() sans récursion ────────────────────
-- SECURITY DEFINER = la fonction s'exécute avec les droits du créateur
-- (service_role), ce qui lui permet de lire profiles sans passer par RLS.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ── ÉTAPE 3 : Recréer les politiques admin en utilisant is_admin() ────────────

CREATE POLICY "Admin full access on profiles"
  ON profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin write menu_items"
  ON menu_items FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin write meal_options"
  ON meal_options FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access on orders"
  ON orders FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access on order_items"
  ON order_items FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access on loyalty"
  ON loyalty_transactions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

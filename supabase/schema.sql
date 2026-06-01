-- ============================================================
-- UVCI Resto — Schéma Supabase complet
-- FIX : fichier était vide. Ce schéma reflète database.types.ts
-- ============================================================

-- Extension UUID
create extension if not exists "pgcrypto";

-- ── Énumérations ─────────────────────────────────────────────
create type user_role    as enum ('student', 'staff', 'admin');
create type order_status as enum (
  'pending_payment', 'pending', 'paid',
  'preparing', 'ready', 'completed',
  'delivered', 'cancelled'
);
create type payment_method as enum ('wave', 'cash');
create type loyalty_type   as enum ('earn', 'redeem', 'expire');

-- ── Profiles ─────────────────────────────────────────────────
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text        not null,
  role           user_role   not null default 'student',
  balance_points integer     not null default 0 check (balance_points >= 0),
  display_name   text,
  avatar_url     text,
  created_at     timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Admin full access on profiles"
  on profiles for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Menu Items ───────────────────────────────────────────────
create table if not exists menu_items (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  description    text,
  price          integer     not null check (price >= 0),
  image_url      text,
  category       text        not null,
  allergens      text[],
  stock_quantity integer     not null default 0 check (stock_quantity >= 0),
  is_available   boolean     not null default true,
  created_at     timestamptz not null default now()
);

alter table menu_items enable row level security;
create policy "Public read menu_items"   on menu_items for select using (true);
create policy "Admin write menu_items"   on menu_items for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ── Meal Options ─────────────────────────────────────────────
create table if not exists meal_options (
  id             uuid        primary key default gen_random_uuid(),
  meal_id        uuid        not null references menu_items(id) on delete cascade,
  name           text        not null,
  price_modifier integer     not null default 0,
  is_mandatory   boolean     not null default false,
  created_at     timestamptz not null default now()
);

alter table meal_options enable row level security;
create policy "Public read meal_options"  on meal_options for select using (true);
create policy "Admin write meal_options"  on meal_options for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ── Orders ───────────────────────────────────────────────────
create table if not exists orders (
  id                   uuid           primary key default gen_random_uuid(),
  user_id              uuid           references auth.users(id) on delete set null,
  client_phone         text,
  status               order_status   not null default 'pending',
  total_price          integer        not null check (total_price >= 0),
  payment_method       payment_method not null,
  wave_checkout_id     text,
  wave_transaction_id  text,
  paid_at              timestamptz,
  pickup_qr_token      text           unique,
  qr_used              boolean        not null default false,
  created_at           timestamptz    not null default now()
);

alter table orders enable row level security;
create policy "Users read own orders"
  on orders for select using (auth.uid() = user_id);
create policy "Users insert own orders"
  on orders for insert with check (auth.uid() = user_id);
create policy "Admin full access on orders"
  on orders for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Order Items ──────────────────────────────────────────────
create table if not exists order_items (
  id              uuid        primary key default gen_random_uuid(),
  order_id        uuid        not null references orders(id) on delete cascade,
  menu_item_id    uuid        not null references menu_items(id),
  quantity        integer     not null check (quantity > 0),
  price_at_order  integer,
  selected_option text[],
  created_at      timestamptz not null default now()
);

alter table order_items enable row level security;
create policy "Users read own order_items"
  on order_items for select using (
    exists (select 1 from orders where id = order_id and user_id = auth.uid())
  );
create policy "Users insert own order_items"
  on order_items for insert with check (
    exists (select 1 from orders where id = order_id and user_id = auth.uid())
  );
create policy "Admin full access on order_items"
  on order_items for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Loyalty Transactions ─────────────────────────────────────
create table if not exists loyalty_transactions (
  id               uuid         primary key default gen_random_uuid(),
  user_id          uuid         not null references auth.users(id) on delete cascade,
  order_id         uuid         references orders(id) on delete set null,
  points           integer      not null,
  transaction_type loyalty_type not null,
  description      text,
  created_at       timestamptz  not null default now()
);

alter table loyalty_transactions enable row level security;
create policy "Users read own loyalty"
  on loyalty_transactions for select using (auth.uid() = user_id);
create policy "Admin full access on loyalty"
  on loyalty_transactions for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Push Subscriptions ───────────────────────────────────────
create table if not exists push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth_key   text        not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
create policy "Users manage own push_subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);

-- ── RPC : rachat de points fidélité ─────────────────────────
create or replace function redeem_loyalty_points(
  p_user_id    uuid,
  p_points     integer,
  p_description text
) returns json
language plpgsql security definer as $$
declare
  v_balance integer;
begin
  select balance_points into v_balance from profiles where id = p_user_id for update;
  if v_balance is null then
    return json_build_object('success', false, 'error', 'Profil introuvable');
  end if;
  if v_balance < p_points then
    return json_build_object('success', false, 'error', 'Solde insuffisant');
  end if;
  update profiles set balance_points = balance_points - p_points where id = p_user_id;
  insert into loyalty_transactions(user_id, points, transaction_type, description)
    values (p_user_id, -p_points, 'redeem', p_description);
  return json_build_object('success', true, 'new_balance', v_balance - p_points);
end;
$$;

-- Rookies Cafe Teresa Rizal — Supabase schema
-- Run this whole file once in Supabase > SQL Editor.

create extension if not exists "pgcrypto";

/* ---------------------------------------------------------------- tables */
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role text not null check (role in ('employee', 'owner'))
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  detail text default '',
  price numeric not null,
  price_22 numeric,
  category text not null check (category in ('Classic','Premium','Matcha','Non-Espresso','Snacks')),
  image text default '',
  available boolean not null default true,
  has_hot boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text not null,
  phone text default '',
  order_type text not null default 'take_out' check (order_type in ('take_out','dine_in','delivery')),
  delivery_address text not null default '',
  payment_method text not null check (payment_method in ('cash','gcash','qrph','debit_card','credit_card')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','verifying','paid','rejected')),
  receipt_url text,
  arrival_time timestamptz not null,
  items jsonb not null,
  total numeric not null,
  note text default '',
  status text not null default 'pending'
    check (status in ('pending','preparing','ready','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text not null,
  phone text not null default '',
  email text default '',
  event_date date not null,
  event_type text default '',
  package text default '',
  guests int,
  venue text default '',
  notes text default '',
  status text not null default 'pending'
    check (status in ('pending','confirmed','declined','cancelled','blocked')),
  created_at timestamptz not null default now()
);
-- one event per day: pending / confirmed / blocked bookings can't share a date
create unique index if not exists bookings_one_per_day on bookings (event_date)
  where status in ('pending','confirmed','blocked');

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text default '',
  order_code text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

/* -------------------------------------------------------------- helpers */
create or replace function is_staff() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

create or replace function is_owner() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

-- username -> login email (the login form only asks for a username)
create or replace function email_for_username(u text) returns text
language sql security definer set search_path = public, auth stable as $$
  select au.email from profiles p join auth.users au on au.id = p.id
  where lower(p.username) = lower(u) limit 1;
$$;

-- customers track their own orders by code (they cannot read the orders table)
create or replace function orders_by_codes(codes text[]) returns setof orders
language sql security definer set search_path = public stable as $$
  select * from orders where code = any(codes) order by created_at desc;
$$;

create or replace function attach_receipt(p_code text, p_url text) returns void
language sql security definer set search_path = public as $$
  update orders set receipt_url = p_url, payment_status = 'verifying'
  where code = p_code and payment_method in ('gcash','qrph') and status <> 'cancelled';
$$;

-- the public booking calendar only learns WHICH days are taken, never who booked them
create or replace function booked_dates() returns table (event_date date, status text)
language sql security definer set search_path = public stable as $$
  select b.event_date, b.status from bookings b
  where b.status in ('pending','confirmed','blocked') and b.event_date >= current_date;
$$;
grant execute on function booked_dates() to anon, authenticated;

grant execute on function email_for_username(text) to anon, authenticated;
grant execute on function orders_by_codes(text[]) to anon, authenticated;
grant execute on function attach_receipt(text, text) to anon, authenticated;

/* ------------------------------------------------------------------ RLS */
alter table profiles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table messages enable row level security;
alter table bookings enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;

-- profiles: you can read and rename yourself (role can't be changed from the app)
create policy "own profile read" on profiles for select to authenticated using (id = auth.uid());
create policy "own profile rename" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- menu is public; employees can toggle availability, owner can do everything
create policy "products public read" on products for select using (true);
create policy "products staff update" on products for update to authenticated using (is_staff());
create policy "products owner insert" on products for insert to authenticated with check (is_owner());
create policy "products owner delete" on products for delete to authenticated using (is_owner());

-- employees may only flip availability; every other column change needs the owner
create or replace function guard_product_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() and (
    new.name is distinct from old.name or new.detail is distinct from old.detail or
    new.price is distinct from old.price or new.price_22 is distinct from old.price_22 or
    new.category is distinct from old.category or new.image is distinct from old.image or
    new.has_hot is distinct from old.has_hot
  ) then
    raise exception 'Only the owner can edit product details';
  end if;
  return new;
end $$;
create trigger products_guard before update on products
  for each row execute function guard_product_update();


create policy "settings public read" on settings for select using (true);
create policy "settings staff write" on settings for all to authenticated
  using (is_staff()) with check (is_staff());

-- orders: anyone can place one, only staff can see/update them
create policy "orders customer insert" on orders for insert to anon, authenticated with check (true);
create policy "orders staff read" on orders for select to authenticated using (is_staff());
create policy "orders staff update" on orders for update to authenticated using (is_staff());

-- bookings: anyone can request a day (as 'pending' only); staff read; only the owner decides
create policy "bookings customer insert" on bookings for insert to anon, authenticated
  with check (status = 'pending');
create policy "bookings owner insert" on bookings for insert to authenticated with check (is_owner());
create policy "bookings staff read" on bookings for select to authenticated using (is_staff());
create policy "bookings owner update" on bookings for update to authenticated
  using (is_owner()) with check (is_owner());
create policy "bookings owner delete" on bookings for delete to authenticated using (is_owner());

-- messages: anyone can send, staff read/update, owner delete
create policy "messages insert" on messages for insert to anon, authenticated with check (true);
create policy "messages staff read" on messages for select to authenticated using (is_staff());
create policy "messages staff update" on messages for update to authenticated using (is_staff());
create policy "messages owner delete" on messages for delete to authenticated using (is_owner());

-- notifications: created by the app on every transaction, read by staff
create policy "notifications insert" on notifications for insert to anon, authenticated with check (true);
create policy "notifications staff read" on notifications for select to authenticated using (is_staff());
create policy "notifications staff update" on notifications for update to authenticated using (is_staff());

/* ------------------------------------------------------------- realtime */
alter publication supabase_realtime add table orders, messages, notifications, products, settings, bookings;

/* -------------------------------------------------------------- storage */
insert into storage.buckets (id, name, public) values ('The Rookie Cafe', 'The Rookie Cafe', true)
on conflict (id) do nothing;

create policy "The Rookie Cafe public read" on storage.objects for select using (bucket_id = 'The Rookie Cafe');
create policy "The Rookie Cafe receipts upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'The Rookie Cafe' and (storage.foldername(name))[1] = 'receipts');
create policy "The Rookie Cafe staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'The Rookie Cafe' and is_staff());

/* ----------------------------------------------------------------- seed */
insert into settings (key, value) values
  ('store_open', '{"open": true}'),
  ('gcash', '{"name": "Rookies Cafe Teresa Rizal", "number": "09189370101", "qr": ""}'),
  ('qrph', '{"name": "Rookies Cafe Teresa Rizal", "qr": ""}')
on conflict do nothing;

insert into products (name, detail, price, price_22, category, image, has_hot) values
('Americano', 'Bold espresso over ice and water', 105, 140, 'Classic', 'https://images.unsplash.com/photo-1593200934786-75d1c755ceb3?auto=format&fit=crop&w=1000&q=82', true),
('Cappuccino', 'Espresso with milk and a cocoa-dusted cream top', 105, 140, 'Classic', 'https://images.unsplash.com/photo-1520903304654-28bd223f96d7?auto=format&fit=crop&w=1000&q=82', true),
('Spanish Latte', 'Espresso with sweetened condensed milk', 105, 140, 'Classic', 'https://images.unsplash.com/photo-1553329537-7a06eb26021c?auto=format&fit=crop&w=1000&q=82', true),
('Sea Salt Latte', 'Espresso latte topped with a silky sea salt cream', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1565252556328-92ee4a9a0983?auto=format&fit=crop&w=1000&q=82', true),
('Rookies Special', 'Our signature iced latte with caramel drizzle and a cocoa-dusted cream top', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=1000&q=82', true),
('Caramel Macchiato', 'Espresso, milk, and rich caramel drizzle', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=1000&q=82', true),
('White Mocha', 'Espresso with creamy white chocolate', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1565252556328-92ee4a9a0983?auto=format&fit=crop&w=1000&q=82', true),
('Cafe Mocha', 'Espresso with dark chocolate and milk', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1000&q=82', true),
('Vanilla Latte', 'Espresso, milk, and sweet vanilla', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1520903304654-28bd223f96d7?auto=format&fit=crop&w=1000&q=82', true),
('Salted Caramel', 'Espresso, milk, and salted caramel', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=1000&q=82', true),
('Hazelnut Latte', 'Espresso with toasted hazelnut and milk', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1553329537-7a06eb26021c?auto=format&fit=crop&w=1000&q=82', true),
('Biscoff Latte', 'Espresso with caramelized Biscoff', 120, 155, 'Premium', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=1000&q=82', true),
('Dirty Matcha', 'Matcha and fresh milk with a shot of espresso', 120, 155, 'Matcha', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1000&q=82', true),
('Matcha Latte', 'Smooth matcha with fresh milk', 120, 155, 'Matcha', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1000&q=82', true),
('Strawberry Matcha', 'Matcha over strawberry purée and milk', 120, 155, 'Matcha', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1000&q=82', false),
('White Chocolate Matcha', 'Matcha with creamy white chocolate', 120, 155, 'Matcha', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1000&q=82', true),
('Matcha Biscoff', 'Matcha with caramelized Biscoff', 120, 155, 'Matcha', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1000&q=82', true),
('Blueberry Matcha', 'Matcha over blueberry purée and milk', 120, 155, 'Matcha', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1000&q=82', false),
('Cocoa', 'Rich chocolate with chilled milk', 120, 155, 'Non-Espresso', 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=1000&q=82', true),
('Strawberry', 'Strawberry purée with fresh milk', 120, 155, 'Non-Espresso', 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=1000&q=82', false),
('Blueberry', 'Blueberry purée with fresh milk', 120, 155, 'Non-Espresso', 'https://images.unsplash.com/photo-1525803377221-4f6ccdaa5133?auto=format&fit=crop&w=1000&q=82', false),
('Thai Pink Milk', 'Sweet, creamy Thai-style pink milk over ice', 120, 155, 'Non-Espresso', 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=1000&q=82', false),
('Cheesy Beef Nachos', 'Nachos loaded with beef and cheese sauce · Sharing', 125, null, 'Snacks', '', false),
('Cheesy Fries', 'Fries smothered in cheese sauce · Sharing', 125, null, 'Snacks', '', false),
('Flavored Fries · Solo', 'Choose BBQ, Cheese, or Sour Cream', 35, null, 'Snacks', '', false),
('Flavored Fries · Sharing', 'Choose BBQ, Cheese, or Sour Cream', 85, null, 'Snacks', '', false);

/* ------------------------------------------------- creating staff accounts
1. Supabase > Authentication > Users > "Add user" (tick "Auto confirm user").
   Use any email you control, e.g. owner@yourdomain.com, and a password.
2. Then link it to a username + role (replace the email / username):

   insert into profiles (id, username, role)
   select id, 'owner', 'owner' from auth.users where email = 'owner@yourdomain.com';

   insert into profiles (id, username, role)
   select id, 'employee', 'employee' from auth.users where email = 'employee@yourdomain.com';

Staff then log in at /employee or /owner with the username + password.
*/

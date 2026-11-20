-- Rookies Cafe Teresa Rizal — migration for an EXISTING Supabase project.
-- Run once in Supabase > SQL Editor. Safe to re-run. It does NOT delete your orders, messages or staff accounts.
-- (Starting a brand-new project instead? Run schema.sql only.)

/* 1. product categories: old set -> new set (keeps your existing products) */
alter table products drop constraint if exists products_category_check;
update products set category = case category
  when 'Coffee'    then 'Classic'
  when 'Frappe'    then 'Premium'
  when 'Milktea'   then 'Non-Espresso'
  when 'Fruit Tea' then 'Non-Espresso'
  when 'Other'     then 'Snacks'
  else category end;
alter table products add constraint products_category_check
  check (category in ('New Flavors','Classic','Premium','Matcha','Non-Espresso','Snacks'));

/* 2. payment methods: add QRPh, debit card, credit card */
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('cash','gcash','qrph','debit_card','credit_card'));

create or replace function attach_receipt(p_code text, p_url text) returns void
language sql security definer set search_path = public as $$
  update orders set receipt_url = p_url, payment_status = 'verifying'
  where code = p_code and payment_method in ('gcash','qrph') and status <> 'cancelled';
$$;

insert into settings (key, value) values ('qrph', '{"name": "Rookies Cafe Teresa Rizal", "qr": ""}')
on conflict (key) do nothing;

/* 3. event bookings */
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
create unique index if not exists bookings_one_per_day on bookings (event_date)
  where status in ('pending','confirmed','blocked');

create or replace function booked_dates() returns table (event_date date, status text)
language sql security definer set search_path = public stable as $$
  select b.event_date, b.status from bookings b
  where b.status in ('pending','confirmed','blocked') and b.event_date >= current_date;
$$;
grant execute on function booked_dates() to anon, authenticated;

alter table bookings enable row level security;
drop policy if exists "bookings customer insert" on bookings;
drop policy if exists "bookings owner insert" on bookings;
drop policy if exists "bookings staff read" on bookings;
drop policy if exists "bookings owner update" on bookings;
drop policy if exists "bookings owner delete" on bookings;
create policy "bookings customer insert" on bookings for insert to anon, authenticated with check (status = 'pending');
create policy "bookings owner insert" on bookings for insert to authenticated with check (is_owner());
create policy "bookings staff read" on bookings for select to authenticated using (is_staff());
create policy "bookings owner update" on bookings for update to authenticated using (is_owner()) with check (is_owner());
create policy "bookings owner delete" on bookings for delete to authenticated using (is_owner());

do $$ begin
  alter publication supabase_realtime add table bookings;
exception when duplicate_object then null; end $$;

/* 4. coffee beans were removed from the app. The table is left in place (harmless);
      to delete it for good, uncomment:  drop table if exists beans;  */

/* 5. (optional) let espresso drinks be ordered hot — the owner can fine-tune per product in the dashboard */
update products set has_hot = true where category in ('New Flavors','Classic','Premium') and has_hot = false;

/* 6. (optional) store the GCash number as digits only, e.g. 0918-937-0101 -> 09189370101 */
update settings set value = jsonb_set(value, '{number}', to_jsonb(regexp_replace(value->>'number', '\D', '', 'g')))
where key = 'gcash' and value ? 'number';

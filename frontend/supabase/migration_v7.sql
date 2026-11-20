/* Rookies Cafe — v7 shared transaction persistence + permissions
   Run once in Supabase > SQL Editor for an EXISTING project.
   Safe to re-run. Does not delete existing orders, bookings, messages, products, or profiles.

   The customer cart intentionally remains in that customer's browser until checkout.
   At checkout, the complete order is inserted into public.orders. The owner dashboard
   reads/updates/deletes those same database rows, so changes are shared by every browser.
*/

-- Ensure every order has the structured fields required by the current checkout.
alter table public.orders
  add column if not exists order_type text not null default 'take_out';
alter table public.orders
  add column if not exists delivery_address text not null default '';

alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders add constraint orders_order_type_check
  check (order_type in ('take_out','dine_in','delivery'));

-- RLS must be enabled; policies below govern all browser/API access.
alter table public.orders enable row level security;
alter table public.notifications enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;

-- Orders: public customers may create orders; staff can read/update; owner can delete.
drop policy if exists "orders customer insert" on public.orders;
drop policy if exists "orders staff read" on public.orders;
drop policy if exists "orders staff update" on public.orders;
drop policy if exists "orders owner delete" on public.orders;
create policy "orders customer insert" on public.orders
  for insert to anon, authenticated with check (true);
create policy "orders staff read" on public.orders
  for select to authenticated using (is_staff());
create policy "orders staff update" on public.orders
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "orders owner delete" on public.orders
  for delete to authenticated using (is_owner());

-- Notifications are database records too; owner can clear/delete them across devices.
drop policy if exists "notifications insert" on public.notifications;
drop policy if exists "notifications staff read" on public.notifications;
drop policy if exists "notifications staff update" on public.notifications;
drop policy if exists "notifications owner delete" on public.notifications;
create policy "notifications insert" on public.notifications
  for insert to anon, authenticated with check (true);
create policy "notifications staff read" on public.notifications
  for select to authenticated using (is_staff());
create policy "notifications staff update" on public.notifications
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "notifications owner delete" on public.notifications
  for delete to authenticated using (is_owner());

-- Explicit API grants; RLS remains the actual access control.
grant select on public.products, public.settings to anon, authenticated;
grant insert, select, update, delete on public.orders to anon, authenticated;
grant insert, select, update, delete on public.bookings to anon, authenticated;
grant insert, select, update, delete on public.messages to anon, authenticated;
grant insert, select, update, delete on public.notifications to anon, authenticated;
grant select, update on public.profiles to authenticated;

-- Realtime lets other open browsers refresh immediately after owner/customer changes.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.settings;
exception when duplicate_object then null;
end $$;

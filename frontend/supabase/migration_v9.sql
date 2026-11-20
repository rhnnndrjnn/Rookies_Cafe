/* Rookies Cafe — v9 editable per-product add-ons
   SAFE, additive migration: does not drop, truncate, recreate, or reset any tables or rows.
   Run once in Supabase > SQL Editor. Safe to re-run.
*/

-- Store each product's own add-on choices and prices.
-- NULL intentionally means "use the existing built-in defaults" for products already in the menu.
alter table public.products
  add column if not exists addons jsonb;

-- Keep product detail edits (including add-ons) restricted to the owner.
-- Existing employee availability updates remain allowed.
create or replace function guard_product_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() and (
    new.name is distinct from old.name or
    new.detail is distinct from old.detail or
    new.price is distinct from old.price or
    new.price_22 is distinct from old.price_22 or
    new.category is distinct from old.category or
    new.image is distinct from old.image or
    new.has_hot is distinct from old.has_hot or
    new.badge is distinct from old.badge or
    new.sort_order is distinct from old.sort_order or
    new.addons is distinct from old.addons
  ) then
    raise exception 'Only the owner can edit product details, labels, add-ons, and menu order';
  end if;
  return new;
end $$;

-- Validate saved add-ons without modifying existing product data.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_addons_array_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_addons_array_check
      check (addons is null or jsonb_typeof(addons) = 'array');
  end if;
end $$;

-- Product rows are already part of Realtime after v8; this guarded addition is harmless
-- if the table is already published and keeps this migration safe to re-run.
do $$
begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;

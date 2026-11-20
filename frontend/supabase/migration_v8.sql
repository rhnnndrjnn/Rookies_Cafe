/* Rookies Cafe — v8 product sorting and optional menu labels
   Run once in Supabase > SQL Editor. Safe to re-run.
   Existing products are initialized newest-first. New products are inserted at the top.
*/

alter table public.products
  add column if not exists sort_order integer,
  add column if not exists badge text;

-- Initialize existing products by newest first, preserving a stable manual order afterwards.
with ranked as (
  select id, row_number() over (order by created_at desc, id) - 1 as position
  from public.products
  where sort_order is null
)
update public.products p
set sort_order = ranked.position
from ranked
where p.id = ranked.id;

alter table public.products
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.products drop constraint if exists products_badge_check;
alter table public.products
  add constraint products_badge_check
  check (badge is null or badge in ('New', 'Best Seller', 'Must Try', 'For Sharing'));

-- Employees may toggle availability, but only owners may change product details,
-- labels, or the shared display order.
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
    new.sort_order is distinct from old.sort_order
  ) then
    raise exception 'Only the owner can edit product details, labels, and menu order';
  end if;
  return new;
end $$;

create index if not exists products_menu_order_idx
  on public.products (sort_order asc, created_at desc);

-- Keep product changes available to subscribed customer browsers.
do $$
begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;

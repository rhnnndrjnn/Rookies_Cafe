/* v3 — run once in Supabase → SQL Editor (safe to re-run)
   - orders: add order type (take out / dine in / delivery) + delivery address
   - orders: payment methods are now cash / gcash / qrph only (old card orders stay readable)
   - orders: order codes are generated on the site, so nothing else changes. */

alter table orders add column if not exists order_type text not null default 'take_out';
alter table orders add column if not exists delivery_address text not null default '';

alter table orders drop constraint if exists orders_order_type_check;
alter table orders add constraint orders_order_type_check
  check (order_type in ('take_out','dine_in','delivery'));

-- keep old debit/credit orders valid, but the site no longer offers them
-- (the existing constraint already allows them, so nothing to change)

/* If your orders_by_codes() function lists columns explicitly, make sure it returns
   order_type and delivery_address too, so customers see them on the My orders page. */

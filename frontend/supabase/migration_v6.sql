/* v6 — run once in Supabase → SQL Editor (safe to re-run)
   - owner can add their own menu categories (the fixed category list on `products` is removed)
   - owner can delete transactions (orders) and notifications
   - owner can edit the About page and categories (stored in the `settings` table, already staff-writable) */

alter table products drop constraint if exists products_category_check;

drop policy if exists "orders owner delete" on orders;
create policy "orders owner delete" on orders for delete to authenticated using (is_owner());

drop policy if exists "notifications owner delete" on notifications;
create policy "notifications owner delete" on notifications for delete to authenticated using (is_owner());

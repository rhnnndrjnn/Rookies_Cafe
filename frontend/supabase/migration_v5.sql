/* v5 — run once in Supabase → SQL Editor (safe to re-run)
   Flavored Fries is now ONE product. The customer picks Solo or Sharing and a flavor
   (BBQ / Cheese / Sour Cream) when ordering.
   price = Solo price (35), price_22 = Sharing price (85). Edit both in Owner portal → Products. */

insert into products (name, detail, price, price_22, category, image, has_hot, available)
select 'Flavored Fries',
       'Pick Solo or Sharing, then your flavor: BBQ, Cheese, or Sour Cream',
       35, 85, 'Snacks',
       coalesce((select image from products where name = 'Flavored Fries · Solo' limit 1), ''),
       false,
       coalesce((select bool_or(available) from products where name like 'Flavored Fries · %'), true)
where not exists (select 1 from products where name = 'Flavored Fries');

delete from products where name in ('Flavored Fries · Solo', 'Flavored Fries · Sharing');

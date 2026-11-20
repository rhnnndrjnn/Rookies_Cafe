/* v4 — run once in Supabase → SQL Editor (safe to re-run)
   - categories are now Classic / Premium / Matcha / Non-Espresso / Snacks ("New Flavors" is gone)
   - Sea Salt Latte + Rookies Special move to Premium
   - hot option for Dirty Matcha, Matcha Latte, White Chocolate Matcha, Matcha Biscoff and Cocoa
     (Strawberry Matcha / Blueberry Matcha stay iced only)
   - new Non-Espresso drink: Thai Pink Milk
   - prices updated from the printed menus
   - "Rookie's Cafe" -> "Rookies Cafe" in the payment settings */

alter table products drop constraint if exists products_category_check;
update products set category = 'Premium' where category = 'New Flavors';
alter table products add constraint products_category_check
  check (category in ('Classic','Premium','Matcha','Non-Espresso','Snacks'));

update products set has_hot = true  where name in ('Dirty Matcha','Matcha Latte','White Chocolate Matcha','Matcha Biscoff','Cocoa');
update products set has_hot = false where name in ('Strawberry Matcha','Blueberry Matcha');

insert into products (name, detail, price, price_22, category, image, has_hot)
select 'Thai Pink Milk', 'Sweet, creamy Thai-style pink milk over ice', 120, 155, 'Non-Espresso',
       'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=1000&q=82', false
where not exists (select 1 from products where name = 'Thai Pink Milk');

update products set price = 105, price_22 = 140 where category = 'Classic';
update products set price = 120, price_22 = 155 where category in ('Premium','Matcha','Non-Espresso');
update products set detail = replace(detail, 'New! ', '') where name in ('Sea Salt Latte','Rookies Special');

update products set price = 125 where name in ('Cheesy Beef Nachos','Cheesy Fries');
update products set price = 35  where name = 'Flavored Fries · Solo';
update products set price = 85  where name = 'Flavored Fries · Sharing';

update settings set value = jsonb_set(value, '{name}', '"Rookies Cafe Teresa Rizal"') where key in ('gcash','qrph');

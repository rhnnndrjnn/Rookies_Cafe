# Rookies Cafe Teresa — website update

Copy `src/` over your project's `src/` (keep your own `src/assets/logo.png`), then:

```bash
npm i @supabase/supabase-js
cp .env.example .env      # fill in your Supabase URL + anon key
npm run dev
```

Your `tailwind.config.js` already needs the `earth` colour scale (unchanged).

## Supabase setup (5 minutes)

1. Create a project → **SQL Editor** → paste and run `supabase/schema.sql`
   (tables, security rules, realtime, the `The Rookie Cafe` storage bucket, and the menu seed).
2. **Authentication → Users → Add user** (tick _Auto confirm_) for the owner.
   Already have a database? Also run `supabase/migration_v3.sql` once (adds order type + delivery address).
3. Link it to a username with the `insert into profiles …` statement at the bottom of `schema.sql` (role `owner`).
4. Put the project URL and anon key in `.env`.

The owner signs in at **/owner**. With no `.env` the site runs in **demo mode** (data saved in the browser; login `owner / owner123`).

## Messenger ordering

Checkout copies the order text and opens Messenger. Add the Facebook page's username or numeric ID as `VITE_MESSENGER_ID` in `.env` (e.g. `VITE_MESSENGER_ID=YourPageName` → `https://m.me/YourPageName`). It is currently set to `106142105566750` (messenger.com/t/106142105566750).

## Where things are

- `lib/db.js` – every Supabase call (and the demo-mode twin). `lib/cart.js` – browser-storage cart.
- `pages/` – customer pages, `pages/Owner.jsx`; `components/staff/` – portal panels.
- Editable pages: the owner changes the **Home**, **About**, **Events** and **Contacts** pages under `/owner` (saved in the `settings` table as `home`, `about`, `events`, `contacts` — no migration needed). Defaults live in `lib/constants.js` (`DEFAULT_HOME`, `DEFAULT_CONTACTS`, …); blank/missing fields fall back to them.
- Prices: 22oz defaults to +₱20 (`SIZE_UPCHARGE`), add-ons ₱9 (`ADDON_PRICE`), add-on names per category in `lib/constants.js`.

## Shared database transactions (v7)

Customer carts are intentionally local to each customer's browser until checkout. A placed order is stored in the shared Supabase `public.orders` table; owner transaction views read, update, and delete those same rows. Bookings, messages, notifications, products, and settings are also stored in Supabase. Owner deletions/updates therefore apply to all browsers, not just the current browser.

For an existing Supabase project, run `supabase/migration_v7.sql` once in Supabase Dashboard → SQL Editor, then redeploy the frontend on Vercel. This migration preserves existing business records. Do not put a Supabase service-role/secret key in Vercel frontend variables; use only the project URL and publishable/anon key.


## Product menu ordering and labels (v8)

For an existing Supabase project, run `supabase/migration_v8.sql` once in the Supabase SQL Editor.
This adds the shared product ordering and optional product label fields. Existing products are
initialized newest-first. New or edited products move to the top automatically, and the owner
can drag products in Owner Dashboard → Products to save a custom order for all customers.

Optional product labels: `New`, `Best Seller`, `Must Try`, and `For Sharing`.

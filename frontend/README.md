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
- Prices: 22oz defaults to +₱20 (`SIZE_UPCHARGE`), add-ons ₱9 (`ADDON_PRICE`), add-on names per category in `lib/constants.js`.

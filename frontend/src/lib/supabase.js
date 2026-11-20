import { createClient } from "@supabase/supabase-js"

// Credentials come from the .env file (Vite only exposes variables prefixed with VITE_).
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
// The older VITE_SUPABASE_ANON_KEY name is still accepted as a fallback.
const url = import.meta.env.VITE_SUPABASE_URL
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// When the env vars are missing the app runs in local demo mode (see db.js).
export const supabase = url && key ? createClient(url, key) : null
export const isDemo = !supabase

if (isDemo) {
  console.warn(
    "[Rookies Cafe] Supabase is NOT connected — running in local demo mode. " +
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env, then restart `npm run dev`.",
  )
}

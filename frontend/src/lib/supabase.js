import { createClient } from "@supabase/supabase-js"

// Credentials come from the .env file (Vite only exposes variables prefixed with VITE_).
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
// The older VITE_SUPABASE_ANON_KEY name is still accepted as a fallback.
const url = import.meta.env.VITE_SUPABASE_URL
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// Shared data must never silently fall back to browser-only storage.
export const supabase = url && key ? createClient(url, key) : null
// A throw-away client that never stores a session. Used to verify customers' emails with a one-time
// code without touching (or signing out) a staff member who is logged in on the same browser.
export const makeIsolatedClient = () =>
  url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    : null
export const isDemo = false
export const hasDatabase = !!supabase

if (!hasDatabase) {
  console.error(
    "[Rookies Cafe] Database is not configured. Set VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_PUBLISHABLE_KEY in the deployment environment.",
  )
}

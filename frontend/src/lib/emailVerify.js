// Email ownership check for the review voucher: a one-time code is emailed to the customer
// (Supabase Auth "email OTP") and must be typed back before a voucher can be claimed.
// Nothing is stored in your tables; the temporary sign-in is discarded immediately.
import { makeIsolatedClient } from "./supabase"
import { normalizeEmail } from "./voucher"

const verified = new Set() // normalised emails proven in this page session

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "10minutemail.net",
  "tempmail.com", "temp-mail.org", "temp-mail.io", "throwawaymail.com", "yopmail.com", "yopmail.net",
  "trashmail.com", "sharklasers.com", "getnada.com", "maildrop.cc", "dispostable.com", "fakeinbox.com",
  "mailnesia.com", "mintemail.com", "emailondeck.com", "mohmal.com", "tempail.com", "burnermail.io",
  "moakt.com", "mytemp.email", "tempinbox.com", "spamgourmet.com", "mailcatch.com", "discard.email",
  "tmpmail.org", "tmpmail.net", "1secmail.com", "dropmail.me", "emltmp.com", "inboxkitten.com",
])

export const isDisposableEmail = (email) => DISPOSABLE.has(String(email).split("@").pop().toLowerCase())
export const isEmailVerified = (email) => verified.has(normalizeEmail(email))

const friendly = (error, fallback) => {
  const msg = String(error?.message || "")
  if (/rate|too many|seconds|limit/i.test(msg) || error?.status === 429)
    return "Too many attempts. Please wait a minute and try again."
  if (/expired|invalid|token/i.test(msg)) return "That code is wrong or has expired. Check the code or request a new one."
  // Show Supabase's own reason too, so setup problems (SMTP, signups disabled…) are easy to spot.
  return msg ? `${fallback} (${msg})` : fallback
}

/** Email a one-time code to the customer. */
export async function sendEmailCode(email) {
  if (isDisposableEmail(email)) throw new Error("Please use your real email address — temporary email services aren’t accepted.")
  const client = makeIsolatedClient()
  if (!client) throw new Error("The shared database is not connected. Please try again later.")
  const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
  if (error) throw new Error(friendly(error, "We couldn’t send the code. Please check the email address and try again."))
}

/** Check the code the customer typed. Resolves to the confirmed (lower-case) email. */
export async function verifyEmailCode(email, code) {
  const client = makeIsolatedClient()
  if (!client) throw new Error("The shared database is not connected. Please try again later.")
  const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token: String(code).trim(), type: "email" })
  if (error || !data?.user?.email) throw new Error(friendly(error, "That code didn’t work. Please try again."))
  const confirmed = data.user.email
  verified.add(normalizeEmail(confirmed))
  client.auth.signOut({ scope: "local" }).catch(() => {}) // not persisted anyway
  return confirmed
}

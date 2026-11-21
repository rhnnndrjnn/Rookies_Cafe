// ₱100 review voucher — works WITHOUT any database change.
//
// Why no new table: the shared Supabase project already has a public storage bucket where
// anonymous visitors may CREATE files under receipts/ (never overwrite or delete). Creating a
// file that already exists fails with "409 Duplicate", which gives us an atomic "only once" lock:
//
//   receipts/vch-claim-<CODE>.json   created when a review earns the voucher   (one per email)
//   receipts/vch-used-<CODE>.json    created when the voucher is spent at checkout (one per voucher)
//
// <CODE> is derived from the customer's normalised email, so the same Gmail (even written as
// j.o.hn+x@gmail.com) always maps to the same voucher and can never get a second one.
// The browser also remembers the voucher locally, so one browser can only ever claim once.
import { supabase, hasDatabase } from "./supabase"
import { BUCKET } from "./constants"

export const VOUCHER_AMOUNT = 100

const SALT = "rookies-cafe-voucher-v1"
const LOCAL_KEY = "rookie_voucher_v1" // { email, code, claimedAt, reviewSaved, usedAt, orderCode }
const PENDING_KEY = "rookie_voucher_pending_v1" // { code } — redeemed, but the order didn't save yet

/* ------------------------------------------------------------------ */
/* Email + code                                                         */
/* ------------------------------------------------------------------ */
/** Lower-case; for Gmail also ignore dots and "+tags" so one inbox = one voucher. */
export function normalizeEmail(raw = "") {
  const email = String(raw).trim().toLowerCase()
  const at = email.lastIndexOf("@")
  if (at < 1) return email
  let local = email.slice(0, at)
  let domain = email.slice(at + 1)
  if (domain === "googlemail.com") domain = "gmail.com"
  if (domain === "gmail.com") local = local.split("+")[0].replace(/\./g, "")
  return `${local}@${domain}`
}

async function sha256Hex(text) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
  }
  // Very old browsers without WebCrypto: two 32-bit FNV-style hashes, still deterministic.
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0
    h2 = Math.imul(h2 + text.charCodeAt(i), 0x85ebca6b) >>> 0
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(2)
}

export async function voucherCodeFor(email) {
  const hash = await sha256Hex(`${SALT}:${normalizeEmail(email)}`)
  return `ROOKIE-${hash.slice(0, 10).toUpperCase()}`
}

export const cleanCode = (v = "") => String(v).trim().toUpperCase().replace(/\s+/g, "")
export const isVoucherCode = (v) => /^ROOKIE-[0-9A-F]{10}$/.test(cleanCode(v))

const claimPath = (code) => `receipts/vch-claim-${code}.json`
const usedPath = (code) => `receipts/vch-used-${code}.json`

/* ------------------------------------------------------------------ */
/* Storage lock helpers                                                 */
/* ------------------------------------------------------------------ */
function requireStorage() {
  if (!hasDatabase || !supabase) throw new Error("The shared database is not connected. Please try again later.")
  return supabase.storage.from(BUCKET)
}

const isDuplicate = (e) =>
  String(e?.statusCode) === "409" || /already exists|duplicate/i.test(e?.message || "")

/** true = created now, false = it already existed. Any other failure throws. */
async function createOnce(path, payload) {
  const bucket = requireStorage()
  const body = new Blob([JSON.stringify({ ...payload, at: new Date().toISOString() })], { type: "application/json" })
  const { error } = await bucket.upload(path, body, { contentType: "application/json", upsert: false })
  if (!error) return true
  if (isDuplicate(error)) return false
  throw new Error("Couldn’t reach the voucher service. Please check your connection and try again.")
}

async function objectExists(path) {
  const bucket = requireStorage()
  const { data, error } = await bucket.exists(path)
  // storage-js reports "file not found" as { data: false, error } — that is a normal "no", not a failure.
  if (data === true) return true
  if (data === false) return false
  if (error) throw new Error("Couldn’t check the voucher right now. Please try again.")
  return false
}

/** Review step: reserve the voucher for this email. false = this email already got one. */
export const claimVoucher = (code) => createOnce(claimPath(code), { code })

/** Checkout: is this a real voucher, and has it been spent? */
export async function checkVoucher(rawCode) {
  const code = cleanCode(rawCode)
  if (!isVoucherCode(code)) return { valid: false, used: false, code }
  const [valid, used] = await Promise.all([objectExists(claimPath(code)), objectExists(usedPath(code))])
  return { valid, used, code }
}

/** Owner dashboard: has this voucher been spent? (the same lock checkout uses) */
export const isVoucherUsed = (rawCode) => objectExists(usedPath(cleanCode(rawCode)))

/**
 * Checkout: spend the voucher. Atomic — if two orders try at once only one wins.
 * If the order itself fails to save afterwards, the same browser may retry (pending flag).
 */
export async function redeemVoucher(rawCode, orderCode) {
  const code = cleanCode(rawCode)
  if (readJSON(PENDING_KEY)?.code === code) return { ok: true }
  const created = await createOnce(usedPath(code), { code, order: orderCode })
  if (!created) return { ok: false }
  writeJSON(PENDING_KEY, { code })
  return { ok: true }
}

/** Call once the order that used the voucher has been saved. */
export function finishRedeem(rawCode, orderCode) {
  const code = cleanCode(rawCode)
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
  const local = getLocalVoucher()
  if (local?.code === code) saveLocalVoucher({ usedAt: new Date().toISOString(), orderCode })
}

/* ------------------------------------------------------------------ */
/* This browser's voucher                                               */
/* ------------------------------------------------------------------ */
function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null")
  } catch {
    return null
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked — the email lock still protects against a second voucher */
  }
}

export const getLocalVoucher = () => readJSON(LOCAL_KEY)
export const saveLocalVoucher = (patch) => writeJSON(LOCAL_KEY, { ...(getLocalVoucher() || {}), ...patch })

/* ------------------------------------------------------------------ */
/* Voucher on an order (stored inside the existing `note` text)         */
/* ------------------------------------------------------------------ */
export const voucherNote = (code, amount) => `Voucher ${code} (-₱${amount})`
const NOTE_RE = /Voucher (ROOKIE-[0-9A-F]{10}) \(-₱(\d+(?:\.\d+)?)\)/

/** { code, amount, subtotal } when the order used a voucher, otherwise null. */
export function orderVoucher(order) {
  const m = NOTE_RE.exec(order?.note || "")
  if (!m) return null
  const amount = Number(m[2])
  return { code: m[1], amount, subtotal: Number(order.total || 0) + amount }
}

/** The customer/staff note without the machine-readable voucher text. */
export const plainNote = (note = "") =>
  String(note)
    .replace(NOTE_RE, "")
    .split(" · ")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ")

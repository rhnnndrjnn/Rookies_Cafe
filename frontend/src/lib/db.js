// Data layer. Talks to Supabase when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are set,
// otherwise falls back to a localStorage "demo mode" with the same API so the whole
// site (including both staff portals) can be tried without a backend.
import { supabase, isDemo, hasDatabase } from "./supabase"
import {
  BOOKING_HOLDS_DAY,
  BUCKET,
  METHOD_LABEL,
  ORDER_TYPE_LABEL,
  SEED_PRODUCTS,
  makeBookingCode,
  makeOrderCode,
  needsReceipt,
} from "./constants"

function requireDatabase() {
  if (!hasDatabase || !supabase) {
    throw new Error("The shared database is not connected. Please contact the site owner; changes cannot be saved locally.")
  }
}

const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36)

/* ------------------------------------------------------------------ */
/* Local engine (demo mode)                                            */
/* ------------------------------------------------------------------ */
const LS = "rookie_db_"
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("rookie-db") : null
const listeners = new Set()

const fire = (table, event) =>
  listeners.forEach((l) => l.tables.includes(table) && l.cb(event))
channel?.addEventListener("message", (e) => fire(e.data.table, e.data.event))
const emit = (table, event) => {
  fire(table, event)
  channel?.postMessage({ table, event })
}

const readLocal = (t) => {
  try {
    return JSON.parse(localStorage.getItem(LS + t) || "null")
  } catch {
    return null
  }
}
const writeLocal = (t, rows) => localStorage.setItem(LS + t, JSON.stringify(rows))

function seedLocal() {
  if (readLocal("seeded_rookie_v2")) return
  const now = new Date().toISOString()
  writeLocal(
    "products",
    SEED_PRODUCTS.map((p) => ({ ...p, id: uid(), created_at: now })),
  )
  writeLocal("orders", [])
  writeLocal("bookings", [])
  writeLocal("messages", [])
  writeLocal("notifications", [])
  writeLocal("settings", [
    { key: "store_open", value: { open: true } },
    { key: "gcash", value: { name: "Rookies Cafe Teresa Rizal", number: "", qr: "" } },
    { key: "qrph", value: { name: "Rookies Cafe Teresa Rizal", qr: "" } },
  ])
  writeLocal("staff", [
    { id: uid(), username: "owner", password: "owner123", role: "owner" },
  ])
  writeLocal("seeded_rookie_v2", true)
}
// Demo-mode data saved before Flavored Fries became one product (Solo / Sharing picked at order time).
function migrateFriesLocal() {
  const rows = readLocal("products")
  if (!rows || !rows.some((p) => /^Flavored Fries · /.test(p.name))) return
  const solo = rows.find((p) => p.name === "Flavored Fries · Solo")
  const sharing = rows.find((p) => p.name === "Flavored Fries · Sharing")
  const base = solo || sharing
  const merged = {
    ...base,
    name: "Flavored Fries",
    detail: "Pick Solo or Sharing, then your flavor: BBQ, Cheese, or Sour Cream",
    price: Number(solo?.price ?? 35),
    price_22: Number(sharing?.price ?? 85),
    available: (solo?.available ?? true) || (sharing?.available ?? true),
  }
  writeLocal("products", [...rows.filter((p) => !/^Flavored Fries · /.test(p.name)), merged])
}
if (isDemo) {
  seedLocal()
  migrateFriesLocal()
}

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */
async function list(table, { order = "created_at", asc = false } = {}) {
  requireDatabase()
  if (isDemo) {
    const rows = [...(readLocal(table) || [])]
    return rows.sort((a, b) => {
      const A = a[order] ?? "",
        B = b[order] ?? ""
      return (A > B ? 1 : A < B ? -1 : 0) * (asc ? 1 : -1)
    })
  }
  const { data, error } = await supabase.from(table).select("*").order(order, { ascending: asc })
  if (error) throw error
  return data
}

async function insert(table, row) {
  requireDatabase()
  const full = { id: uid(), created_at: new Date().toISOString(), ...row }
  if (isDemo) {
    writeLocal(table, [full, ...(readLocal(table) || [])])
    emit(table, { type: "INSERT", row: full })
    return full
  }
  // No .select() — anonymous visitors can insert but not read back.
  const { error } = await supabase.from(table).insert(full)
  if (error) throw error
  return full
}

async function update(table, id, patch) {
  requireDatabase()
  if (isDemo) {
    let updated
    writeLocal(
      table,
      (readLocal(table) || []).map((r) => (r.id === id ? (updated = { ...r, ...patch }) : r)),
    )
    if (updated) emit(table, { type: "UPDATE", row: updated })
    return updated
  }
  const { error } = await supabase.from(table).update(patch).eq("id", id)
  if (error) throw error
}

async function remove(table, id) {
  requireDatabase()
  if (isDemo) {
    writeLocal(
      table,
      (readLocal(table) || []).filter((r) => r.id !== id),
    )
    emit(table, { type: "DELETE", row: { id } })
    return
  }
  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) throw error
}

/** Subscribe to changes. cb receives {type, row}. Returns an unsubscribe function. */
export function subscribe(tables, cb) {
  if (!hasDatabase || !supabase) return () => {}
  if (isDemo) {
    const l = { tables, cb }
    listeners.add(l)
    return () => listeners.delete(l)
  }
  const ch = supabase.channel("rookie-" + tables.join("-") + "-" + uid())
  tables.forEach((table) =>
    ch.on("postgres_changes", { event: "*", schema: "public", table }, (p) =>
      cb({ type: p.eventType, row: p.new && Object.keys(p.new).length ? p.new : p.old, table }),
    ),
  )
  ch.subscribe()
  return () => supabase.removeChannel(ch)
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */
export const getProducts = () => list("products", { order: "created_at", asc: true })
export const saveProduct = (product) =>
  product.id ? update("products", product.id, product) : insert("products", product)
export const deleteProduct = (id) => remove("products", id)
export const setProductAvailable = (id, available) => update("products", id, { available })

/* ------------------------------------------------------------------ */
/* Settings (store status, GCash + QRPh details)                       */
/* ------------------------------------------------------------------ */
export async function getSettings() {
  requireDatabase()
  let rows
  if (isDemo) rows = readLocal("settings") || []
  else {
    const { data, error } = await supabase.from("settings").select("*")
    if (error) throw error
    rows = data
  }
  const out = {
    store_open: { open: true },
    gcash: { name: "", number: "", qr: "" },
    qrph: { name: "", qr: "" },
    categories: null, // owner's category list (null = defaults)
    about: null, // owner's About-page content (null = defaults)
    events: null, // owner's Events-page content (null = defaults)
    home: null, // owner's Home-page content (null = defaults)
    contacts: null, // owner's Contacts-page content (null = defaults)
    booking_policy: null, // owner-editable booking policies (null = defaults)
  }
  rows.forEach((r) => (out[r.key] = r.value))
  return out
}

export async function setSetting(key, value) {
  requireDatabase()
  if (isDemo) {
    const rows = readLocal("settings") || []
    const exists = rows.some((r) => r.key === key)
    writeLocal(
      "settings",
      exists ? rows.map((r) => (r.key === key ? { key, value } : r)) : [...rows, { key, value }],
    )
    emit("settings", { type: "UPDATE", row: { key, value } })
    return
  }
  const { error } = await supabase.from("settings").upsert({ key, value })
  if (error) throw error
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */
export const getOrders = () => list("orders")

export async function createOrder(order) {
  const row = {
    code: makeOrderCode(),
    status: "pending",
    // GCash / QRPh: the customer sends proof in Messenger, so the owner marks it paid once seen.
    payment_status: needsReceipt(order.payment_method) ? "verifying" : "unpaid",
    ...order,
  }
  let saved
  try {
    saved = await insert("orders", row)
  } catch (e) {
    // The database hasn't had supabase/migration_v3.sql run yet (no order_type / delivery_address
    // columns). Don't lose the order: store those details inside the note instead.
    if (!/order_type|delivery_address|schema cache/i.test(e?.message || "")) throw e
    const { order_type, delivery_address, ...rest } = row
    const extra = [ORDER_TYPE_LABEL[order_type], delivery_address && `Deliver to: ${delivery_address}`]
      .filter(Boolean)
      .join(" · ")
    saved = await insert("orders", { ...rest, note: [extra, rest.note].filter(Boolean).join(" · ") })
  }
  await pushNotification({
    type: "order",
    title: "New order " + saved.code,
    body: `${saved.customer_name} · ₱${Number(saved.total).toFixed(2)} · ${
      METHOD_LABEL[saved.payment_method] || saved.payment_method
    } · ${ORDER_TYPE_LABEL[saved.order_type] || ""}${needsReceipt(saved.payment_method) ? " (check Messenger for proof)" : ""}`,
    order_code: saved.code,
  })
  return saved
}

/** Owner: permanently delete a transaction. */
export const deleteOrder = (id) => remove("orders", id)

export async function updateOrder(order, patch, notifyText) {
  await update("orders", order.id, patch)
  if (notifyText)
    await pushNotification({
      type: "order",
      title: `${order.code}: ${notifyText}`,
      body: order.customer_name,
      order_code: order.code,
    })
}

/** Customers can only look up their own orders by code. */
export async function getOrdersByCodes(codes) {
  if (!codes.length) return []
  requireDatabase()
  if (isDemo) return (readLocal("orders") || []).filter((o) => codes.includes(o.code))
  const { data, error } = await supabase.rpc("orders_by_codes", { codes })
  if (error) throw error
  return data || []
}

/** Lets a customer attach a GCash receipt to an existing order they own. */
export async function attachReceipt(code, url) {
  requireDatabase()
  if (isDemo) {
    const o = (readLocal("orders") || []).find((x) => x.code === code)
    if (o) await update("orders", o.id, { receipt_url: url, payment_status: "verifying" })
  } else {
    const { error } = await supabase.rpc("attach_receipt", { p_code: code, p_url: url })
    if (error) throw error
  }
  await pushNotification({
    type: "payment",
    title: "New payment receipt " + code,
    body: "Customer re-uploaded a receipt",
    order_code: code,
  })
}

/* ------------------------------------------------------------------ */
/* Event bookings (mobile coffee cart)                                 */
/* ------------------------------------------------------------------ */
/** Staff only (RLS): every booking, soonest event first. */
export const getBookings = () => list("bookings", { order: "event_date", asc: true })

/**
 * Public: which days are already taken, WITHOUT exposing who booked them.
 * Returns [{ event_date: "YYYY-MM-DD", status }].
 */
export async function getBookedDates() {
  requireDatabase()
  if (isDemo)
    return (readLocal("bookings") || [])
      .filter((b) => BOOKING_HOLDS_DAY.includes(b.status))
      .map((b) => ({ event_date: b.event_date, status: b.status }))
  const { data, error } = await supabase.rpc("booked_dates")
  if (error) throw error
  return data || []
}

const DAY_TAKEN = "Sorry — that date was just taken. Please pick another day."

export async function createBooking(booking) {
  const row = { code: makeBookingCode(), status: "pending", ...booking }
  if (isDemo) {
    const taken = (readLocal("bookings") || []).some(
      (b) => b.event_date === row.event_date && BOOKING_HOLDS_DAY.includes(b.status),
    )
    if (taken) throw new Error(DAY_TAKEN)
  }
  let saved
  try {
    saved = await insert("bookings", row)
  } catch (e) {
    // unique index on (event_date) for active bookings — someone else got there first
    if (e?.code === "23505") throw new Error(DAY_TAKEN)
    throw e
  }
  await pushNotification({
    type: "booking",
    title: "New event booking " + saved.code,
    body: `${saved.customer_name} · ${saved.event_date} · ${saved.package || "package TBD"}`,
  })
  return saved
}

export async function setBookingStatus(booking, status, notifyText) {
  await update("bookings", booking.id, { status })
  if (notifyText)
    await pushNotification({
      type: "booking",
      title: `${booking.code}: ${notifyText}`,
      body: `${booking.customer_name} · ${booking.event_date}`,
    })
}

/** Owner: close a free day (holiday, day off, already booked elsewhere…). */
export async function blockDate(date, reason = "") {
  try {
    return await insert("bookings", {
      code: "BLOCK-" + date,
      customer_name: "Blocked by owner",
      phone: "",
      event_date: date,
      status: "blocked",
      notes: reason,
    })
  } catch (e) {
    if (e?.code === "23505") throw new Error("That day already has a booking.")
    throw e
  }
}
export const deleteBooking = (id) => remove("bookings", id)

/** Owner: edit the details of a booking (name, date, package, venue…). */
export async function updateBooking(booking, patch, notifyText) {
  if (isDemo && patch.event_date && patch.event_date !== booking.event_date) {
    const taken = (readLocal("bookings") || []).some(
      (b) => b.id !== booking.id && b.event_date === patch.event_date && BOOKING_HOLDS_DAY.includes(b.status),
    )
    if (taken) throw new Error("That day already has a booking.")
  }
  try {
    await update("bookings", booking.id, patch)
  } catch (e) {
    if (e?.code === "23505") throw new Error("That day already has a booking.")
    throw e
  }
  if (notifyText)
    await pushNotification({
      type: "booking",
      title: `${booking.code}: ${notifyText}`,
      body: `${patch.customer_name || booking.customer_name} · ${patch.event_date || booking.event_date}`,
    })
}

/* ------------------------------------------------------------------ */
/* Messages & notifications                                            */
/* ------------------------------------------------------------------ */
export const getMessages = () => list("messages")
export const markMessage = (id, read) => update("messages", id, { read })
export const deleteMessage = (id) => remove("messages", id)

export async function sendMessage({ name, email, message }) {
  const saved = await insert("messages", { name, email, message, read: false })
  await pushNotification({
    type: "message",
    title: "New message from " + name,
    body: message.slice(0, 90),
  })
  return saved
}

export const getNotifications = () => list("notifications")
export const pushNotification = (n) => insert("notifications", { read: false, ...n })
export const markNotification = (id) => update("notifications", id, { read: true })
export const deleteNotification = (id) => remove("notifications", id)
export async function clearNotifications() {
  const all = await getNotifications()
  await Promise.all(all.map((n) => remove("notifications", n.id)))
}
export async function markAllNotifications() {
  const unread = (await getNotifications()).filter((n) => !n.read)
  await Promise.all(unread.map((n) => markNotification(n.id)))
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */
function compressImage(file, max = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(src)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read image"))), "image/jpeg", 0.82)
    }
    img.onerror = () => reject(new Error("That file is not a valid image"))
    img.src = src
  })
}

const blobToDataUrl = (blob) =>
  new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.readAsDataURL(blob)
  })

/** folder: "receipts" | "products" | "gcash" | "qrph" — returns a URL (or data URL in demo mode). */
export async function uploadImage(file, folder) {
  requireDatabase()
  const blob = await compressImage(file)
  if (isDemo) return blobToDataUrl(blob)
  const path = `${folder}/${Date.now()}-${uid().slice(0, 8)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
  })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/* ------------------------------------------------------------------ */
/* Staff auth (username + password)                                    */
/* ------------------------------------------------------------------ */
const SESSION_KEY = "rookie_staff_session"

async function profileFor(user) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (error) throw error
  return { id: user.id, username: data.username, role: data.role }
}

export async function getSession() {
  if (!hasDatabase) return null
  if (isDemo) {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")
      if (!s) return null
      const acc = (readLocal("staff") || []).find((a) => a.id === s.id)
      return acc ? { id: acc.id, username: acc.username, role: acc.role } : null
    } catch {
      return null
    }
  }
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  try {
    return await profileFor(data.session.user)
  } catch {
    return null
  }
}

export async function login(username, password) {
  requireDatabase()
  username = username.trim().toLowerCase()
  if (isDemo) {
    const acc = (readLocal("staff") || []).find(
      (a) => a.username.toLowerCase() === username && a.password === password,
    )
    if (!acc) throw new Error("Incorrect username or password.")
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: acc.id }))
    return { id: acc.id, username: acc.username, role: acc.role }
  }
  const { data: email, error: e1 } = await supabase.rpc("email_for_username", { u: username })
  if (e1 || !email) throw new Error("Incorrect username or password.")
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error("Incorrect username or password.")
  return profileFor(data.user)
}

export async function logout() {
  if (!hasDatabase) return
  if (isDemo) sessionStorage.removeItem(SESSION_KEY)
  else await supabase.auth.signOut()
}

export async function changeCredentials(session, { username, currentPassword, newPassword }) {
  requireDatabase()
  username = username.trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,}$/.test(username))
    throw new Error("Username must be at least 3 characters (letters, numbers, . _ -).")
  if (newPassword && newPassword.length < 6)
    throw new Error("New password must be at least 6 characters.")

  if (isDemo) {
    const staff = readLocal("staff") || []
    const acc = staff.find((a) => a.id === session.id)
    if (!acc || acc.password !== currentPassword) throw new Error("Current password is incorrect.")
    if (staff.some((a) => a.id !== acc.id && a.username.toLowerCase() === username))
      throw new Error("That username is already taken.")
    writeLocal(
      "staff",
      staff.map((a) =>
        a.id === acc.id ? { ...a, username, password: newPassword || a.password } : a,
      ),
    )
    return { ...session, username }
  }

  const { data: u } = await supabase.auth.getUser()
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: u.user.email,
    password: currentPassword,
  })
  if (authErr) throw new Error("Current password is incorrect.")
  const { error } = await supabase.from("profiles").update({ username }).eq("id", session.id)
  if (error)
    throw new Error(error.code === "23505" ? "That username is already taken." : error.message)
  if (newPassword) {
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
    if (pwErr) throw new Error(pwErr.message)
  }
  return { ...session, username }
}

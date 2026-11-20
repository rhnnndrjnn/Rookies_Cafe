import { BUSINESS, ORDER_TYPE_LABEL, METHOD_LABEL, fmtDay, lineSummary, peso } from "./constants.js"

const timeText = (iso) =>
  new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })

/** The plain-text order the customer pastes into Messenger. */
export function buildOrderMessage(order, { lalamove = false } = {}) {
  const isDelivery = order.order_type === "delivery"
  const arrivalDate = new Date(order.arrival_time)
  const datePart = arrivalDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
  const lines = [
    `NEW ORDER — ${BUSINESS.short}`,
    `Order code: ${order.code}`,
    `Name: ${order.customer_name}`,
    `Order type: ${ORDER_TYPE_LABEL[order.order_type]}`,
    `${isDelivery ? "Delivery" : "Arrival"} time: ${datePart}, ${timeText(order.arrival_time)}`,
  ]
  if (isDelivery) lines.push(`Delivery address: ${order.delivery_address}`)
  if (lalamove) lines.push("Delivery via: Lalamove (outside Teresa) — rider fare and other charges may apply, please confirm with me")
  lines.push(`Payment: ${METHOD_LABEL[order.payment_method]}`, "", "Items:")
  order.items.forEach((l, i) => {
    const detail = lineSummary(l)
    lines.push(`${i + 1}. ${l.qty}x ${l.name}${detail ? ` (${detail})` : ""} — ${peso(l.qty * l.unitPrice)}`)
  })
  lines.push("", `Total: ${peso(order.total)}`)
  if (order.note) lines.push(`Note: ${order.note}`)
  if (order.payment_method !== "cash")
    lines.push("", `I'll send my ${METHOD_LABEL[order.payment_method]} payment screenshot here.`)
  return lines.join("\n")
}

/** Copy text to the clipboard. Works on https and falls back for older / in-app browsers. */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0"
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand("copy")
    ta.remove()
    return ok
  } catch {
    return false
  }
}

/** Save an image. On phones this opens the share sheet ("Save Image"); on desktop it downloads. */
export async function saveImage(url, filename) {
  try {
    const blob = await (await fetch(url)).blob()
    const file = new File([blob], filename, { type: blob.type || "image/jpeg" })
    const touch = window.matchMedia?.("(pointer: coarse)").matches
    if (touch && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return true
    }
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 2000)
    return true
  } catch (e) {
    if (e?.name === "AbortError") return false // user closed the share sheet
    window.open(url, "_blank", "noopener") // last resort: open it so it can be long-pressed
    return false
  }
}

/** The plain-text event request the customer pastes into Messenger. */
export function buildBookingMessage(b) {
  const lines = [
    `EVENT BOOKING REQUEST — ${BUSINESS.short}`,
    `Reference: ${b.code}`,
    `Name: ${b.customer_name}`,
    `Mobile: ${b.phone}`,
  ]
  if (b.email) lines.push(`Email: ${b.email}`)
  lines.push(
    `Event date: ${fmtDay(b.event_date)}`,
    `Event type: ${b.event_type}`,
    `Package: ${b.package}`,
    `Guests: ${b.guests}`,
    `Event place: ${b.venue}`,
  )
  if (b.notes) lines.push(`Notes: ${b.notes}`)
  lines.push("Booking policies: Read and accepted")
  return lines.join("\n")
}

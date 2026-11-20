import { useCallback, useEffect, useRef, useState } from "react"
import { getBookedDates, getOrdersByCodes, getProducts, getSettings, subscribe } from "./db.js"

/** Live menu data shared by the customer pages and the staff portals. */
export function useMenuData() {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({
    store_open: { open: true },
    gcash: { name: "", number: "", qr: "" },
    qrph: { name: "", qr: "" },
    categories: null,
    about: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getProducts(), getSettings()])
      setProducts(p)
      setSettings(s)
      setError("")
    } catch (e) {
      setError(e.message || "Could not load the menu.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return subscribe(["products", "settings"], load)
  }, [load])

  return { products, settings, loading, error, reload: load }
}

/* ---- customer order tracking: polls the visitor's own orders and toasts on status changes ---- */
import { forgetOrderCode, getMyOrderCodes, rememberOrderCode } from "./cart.js"
import { useNotify } from "./notify.jsx"
import { STATUS_LABEL } from "./constants.js"

export function useMyOrders(active) {
  const notify = useNotify()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const seen = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const rows = await getOrdersByCodes(getMyOrderCodes())
      if (seen.current) {
        rows.forEach((o) => {
          const prev = seen.current[o.code]
          if (prev && (prev.status !== o.status || prev.payment_status !== o.payment_status)) {
            if (prev.payment_status !== o.payment_status && o.payment_status === "paid")
              notify(`Payment confirmed · ${o.code}`, "We received your payment.", { tone: "success" })
            else if (prev.payment_status !== o.payment_status && o.payment_status === "rejected")
              notify(`Receipt problem · ${o.code}`, "We couldn't verify your receipt. Please re-upload it in Orders.", { tone: "error", duration: 9000 })
            if (prev.status !== o.status)
              notify(
                `${o.code}: ${STATUS_LABEL[o.status]}`,
                o.status === "ready" ? "Your order is ready — see you at the counter!" : "",
                { tone: o.status === "cancelled" ? "error" : "success", duration: 7000 },
              )
          }
        })
      }
      seen.current = Object.fromEntries(rows.map((o) => [o.code, o]))
      setOrders(rows)
    } catch {
      /* offline — try again on the next tick */
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, active ? 8000 : 20000)
    const unsub = subscribe(["orders"], refresh)
    return () => {
      clearInterval(t)
      unsub()
    }
  }, [refresh, active])

  const track = (code) => {
    rememberOrderCode(code.trim().toUpperCase())
    return refresh()
  }
  const remove = (code) => {
    forgetOrderCode(code)
    if (seen.current) delete seen.current[code]
    setOrders((rows) => rows.filter((o) => o.code !== code))
  }
  return { orders, loading, refresh, track, remove }
}

/**
 * Days that are already booked, for the public booking calendar.
 * Customers can't read the bookings table (privacy), so this polls a safe RPC that only
 * returns dates — and refreshes when the tab regains focus.
 */
export function useBookedDates() {
  const [dates, setDates] = useState({}) // { "YYYY-MM-DD": status }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    try {
      const rows = await getBookedDates()
      setDates(Object.fromEntries(rows.map((r) => [String(r.event_date).slice(0, 10), r.status])))
      setError("")
    } catch (e) {
      setError(e.message || "Could not load availability.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000)
    const onVisible = () => document.visibilityState === "visible" && refresh()
    document.addEventListener("visibilitychange", onVisible)
    const unsub = subscribe(["bookings"], refresh) // instant in demo mode / for staff
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", onVisible)
      unsub()
    }
  }, [refresh])

  return { dates, loading, error, refresh }
}

import { useCallback, useEffect, useRef, useState } from "react"
import {
  getBookings,
  getMessages,
  getNotifications,
  getOrders,
  getProducts,
  getSettings,
  subscribe,
} from "./db.js"
import { chime, systemNotify, useNotify } from "./notify.jsx"

/** Everything the staff portals need, kept live. Toasts + sound on every new transaction. */
export function useStaffData() {
  const notify = useNotify()
  const [orders, setOrders] = useState([])
  const [messages, setMessages] = useState([])
  const [notifications, setNotifications] = useState([])
  const [products, setProducts] = useState([])
  const [bookings, setBookings] = useState([])
  const [settings, setSettings] = useState({
    store_open: { open: true },
    gcash: { name: "", number: "", qr: "" },
    qrph: { name: "", qr: "" },
    categories: null,
    about: null,
    events: null,
    home: null,
    contacts: null,
    booking_policy: null,
    menu_addons: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const booted = useRef(false)

  const loadAll = useCallback(async () => {
    try {
      const [o, m, n, p, b, s] = await Promise.all([
        getOrders(),
        getMessages(),
        getNotifications(),
        getProducts(),
        getBookings(),
        getSettings(),
      ])
      setOrders(o)
      setMessages(m)
      setNotifications(n)
      setProducts(p)
      setBookings(b)
      setSettings(s)
      setError("")
    } catch (e) {
      setError(e.message || "Could not load data.")
    } finally {
      setLoading(false)
      booted.current = true
    }
  }, [])

  useEffect(() => {
    loadAll()
    const unsubs = [
      subscribe(["orders"], async () => setOrders(await getOrders())),
      subscribe(["messages"], async () => setMessages(await getMessages())),
      subscribe(["bookings"], async () => setBookings(await getBookings())),
      subscribe(["products", "settings"], async () => {
        const [p, s] = await Promise.all([getProducts(), getSettings()])
        setProducts(p)
        setSettings(s)
      }),
      subscribe(["notifications"], async (ev) => {
        setNotifications(await getNotifications())
        if (ev.type === "INSERT" && booted.current && ev.row) {
          const incoming = /^New /.test(ev.row.title) // new order / message / booking
          notify(ev.row.title, ev.row.body, { tone: "info", duration: 7000 })
          if (incoming) {
            chime()
            systemNotify(ev.row.title, ev.row.body)
          }
        }
      }),
    ]
    // Poll shared records as a fallback so owner/customer views converge even
    // when a browser connection misses a Realtime event.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadAll()
    }, 10000)
    const onVisible = () => document.visibilityState === "visible" && loadAll()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      unsubs.forEach((u) => u())
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [loadAll, notify])

  return { orders, messages, notifications, products, bookings, settings, loading, error, reload: loadAll }
}

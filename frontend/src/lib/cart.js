import { useCallback, useEffect, useState } from "react"

// The cart lives in the visitor's browser only (localStorage), never in Supabase.
const KEY = "rookie_cart_v1"
const CODES = "rookie_my_orders_v1"

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]")
  } catch {
    return []
  }
}

// Older saved carts: drop the removed "bean" option, and treat missing `selected` as ticked.
const migrate = (rows) =>
  rows.map(({ bean: _bean, ...l }) => ({ ...l, selected: l.selected !== false }))

export function useCart() {
  const [items, setItems] = useState(() => migrate(read(KEY)))

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* storage full or blocked — cart still works for this session */
    }
  }, [items])

  // keep multiple tabs in sync
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setItems(migrate(read(KEY)))
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const uid = () => Math.random().toString(36).slice(2, 10)

  const addLine = useCallback((line) => {
    setItems((prev) => {
      // merge identical configurations
      const sig = (l) =>
        JSON.stringify([l.productId, l.sugar, l.temp, l.size, [...(l.addons || [])].sort()])
      const same = prev.find((p) => sig(p) === sig(line))
      if (same)
        return prev.map((p) =>
          p === same ? { ...p, qty: Math.min(20, p.qty + line.qty), selected: true } : p,
        )
      return [...prev, { ...line, id: uid(), selected: true }]
    })
  }, [])

  const updateLine = useCallback(
    (id, patch) => setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    [],
  )
  const removeLine = useCallback((id) => setItems((prev) => prev.filter((l) => l.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  // ---- choose what to buy ----
  const toggleSelect = useCallback(
    (id) => setItems((prev) => prev.map((l) => (l.id === id ? { ...l, selected: l.selected === false } : l))),
    [],
  )
  const setAllSelected = useCallback(
    (selected) => setItems((prev) => prev.map((l) => ({ ...l, selected }))),
    [],
  )
  /** After checkout only the items that were bought leave the cart; the rest stay. */
  const removeSelected = useCallback(
    () => setItems((prev) => prev.filter((l) => l.selected === false)),
    [],
  )

  const selectedItems = items.filter((l) => l.selected !== false)
  const count = items.reduce((n, l) => n + l.qty, 0)
  const total = items.reduce((n, l) => n + l.qty * l.unitPrice, 0)
  const selectedCount = selectedItems.reduce((n, l) => n + l.qty, 0)
  const selectedTotal = selectedItems.reduce((n, l) => n + l.qty * l.unitPrice, 0)
  return {
    items,
    selectedItems,
    count,
    total,
    selectedCount,
    selectedTotal,
    addLine,
    updateLine,
    removeLine,
    clear,
    toggleSelect,
    setAllSelected,
    removeSelected,
  }
}

// Order codes the visitor placed on this device, so they can track them.
export const getMyOrderCodes = () => read(CODES)
export const rememberOrderCode = (code) => {
  const codes = [code, ...read(CODES).filter((c) => c !== code)].slice(0, 30)
  localStorage.setItem(CODES, JSON.stringify(codes))
}

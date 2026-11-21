import { useMemo, useState } from "react"
import { Icon, Modal } from "../ui.jsx"
import { METHOD_LABEL, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL, fmtDateTime, lineSummary, needsReceipt, peso } from "../../lib/constants.js"
import { updateOrder } from "../../lib/db.js"
import { orderVoucher, plainNote } from "../../lib/voucher.js"
import { useNotify } from "../../lib/notify.jsx"
import { PanelHeader } from "./Shell.jsx"

// Legacy statuses (preparing / ready) count as pending.
const isPending = (o) => !["completed", "cancelled"].includes(o.status)
const FILTERS = [
  { id: "pending", label: "Pending", test: isPending },
  { id: "completed", label: "Completed", test: (o) => o.status === "completed" },
  { id: "all", label: "All", test: () => true },
]

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString()

export function OrderStats({ orders }) {
  const today = orders.filter((o) => isToday(o.created_at))
  const sales = today
    .filter((o) => o.status === "completed")
    .reduce((n, o) => n + Number(o.total), 0)
  const cards = [
    { label: "Pending", value: orders.filter(isPending).length },
    { label: "Completed", value: orders.filter((o) => o.status === "completed").length },
    { label: "Orders today", value: today.length },
    { label: "Sales today", value: peso(sales) },
  ]
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="min-w-0 rounded-2xl border border-earth-300 bg-earth-50 p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-earth-600">{c.label}</p>
          <p className="display-title mt-2 truncate text-xl sm:text-3xl">{c.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function OrdersPanel({ orders, storeOpen }) {
  const notify = useNotify()
  const [filter, setFilter] = useState("pending")
  const [receipt, setReceipt] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const test = FILTERS.find((f) => f.id === filter).test

  const list = useMemo(() => {
    const rows = orders.filter(test)
    // soonest arrival first for pending orders, newest first otherwise
    return filter === "pending"
      ? [...rows].sort((a, b) => new Date(a.arrival_time) - new Date(b.arrival_time))
      : rows
  }, [orders, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (order, patch, text) => {
    setBusyId(order.id)
    try {
      await updateOrder(order, patch, text)
    } catch (e) {
      notify("Update failed", e.message, { tone: "error" })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PanelHeader eyebrow="Dashboard" title="Orders">
        {!storeOpen && <span className="badge cancelled">Store closed — not accepting orders</span>}
      </PanelHeader>
      <OrderStats orders={orders} />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip whitespace-nowrap ${filter === f.id ? "chip-active" : ""}`}>
            {f.label}
            <span className="ml-1.5 opacity-60">{orders.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-earth-300 bg-earth-50 px-5 py-16 text-center text-sm text-earth-600">
          No orders here right now.
        </p>
      ) : (
        <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          {list.map((o) => {
            const busy = busyId === o.id
            const voucher = orderVoucher(o)
            return (
              <article key={o.id} className="min-w-0 rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="display-title text-xl">{o.code}</p>
                    <p className="text-sm font-semibold">
                      {o.customer_name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {voucher && <span className="badge completed">🎟 Voucher −{peso(voucher.amount)}</span>}
                    <span className="badge">{ORDER_TYPE_LABEL[o.order_type] || "Pick up"}</span>
                    <span className={`badge ${isPending(o) ? "pending" : o.status}`}>{isPending(o) ? "Pending" : STATUS_LABEL[o.status]}</span>
                    <span className={`badge ${o.payment_status}`}>
                      {METHOD_LABEL[o.payment_method] || o.payment_method} · {PAYMENT_LABEL[o.payment_status]}
                    </span>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-earth-600">
                  <Icon name="clock" size={14} /> {o.order_type === "delivery" ? "Deliver" : "Arrives"} {fmtDateTime(o.arrival_time)} · placed {fmtDateTime(o.created_at)}
                </p>
                <ul className="mt-3 divide-y divide-earth-200 text-sm">
                  {o.items.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2">
                      <span>
                        <strong>{l.qty}× {l.name}</strong>
                        <span className="block text-[11px] text-earth-600">{lineSummary(l)}</span>
                      </span>
                      <span className="shrink-0">{peso(l.qty * l.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
                {o.order_type === "delivery" && o.delivery_address && (
                  <p className="mt-2 flex gap-1.5 rounded-lg bg-earth-100 p-2.5 text-xs text-earth-700">
                    <Icon name="pin" size={14} /> <span className="min-w-0 break-words"><strong>Deliver to:</strong> {o.delivery_address}</span>
                  </p>
                )}
                {plainNote(o.note) && (
                  <p className="mt-2 rounded-lg bg-earth-100 p-2.5 text-xs text-earth-700">
                    <strong>Note:</strong> {plainNote(o.note)}
                  </p>
                )}
                {voucher && (
                  <div className="mt-2 rounded-lg border border-[#9CC9A3] bg-[#E3F1E5] p-2.5 text-xs leading-5 text-[#1F5A2B]">
                    <p className="font-bold">🎟 Customer used a ₱{voucher.amount} review voucher</p>
                    <p className="break-all">Code: {voucher.code}</p>
                    <p>Subtotal {peso(voucher.subtotal)} − voucher {peso(voucher.amount)} = collect {peso(o.total)}</p>
                  </div>
                )}
                <p className="mt-2 flex justify-between border-t border-earth-300 pt-3 font-semibold">
                  <span>Total{voucher ? " to collect" : ""}</span>
                  <span>{peso(o.total)}</span>
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:flex min-[420px]:flex-wrap">
                  {o.receipt_url && (
                    <button className="btn-sm" onClick={() => setReceipt(o)}>
                      <Icon name="receipt" size={14} /> View receipt
                    </button>
                  )}
                  {isPending(o) && o.payment_status !== "paid" && (
                    <button disabled={busy} className="btn-sm" onClick={() => act(o, { payment_status: "paid" }, `${METHOD_LABEL[o.payment_method]} payment received`)}>
                      <Icon name="check" size={14} /> Mark paid
                    </button>
                  )}
                  {isPending(o) && (
                    <button disabled={busy} className="btn-sm solid" onClick={() => act(o, { status: "completed", payment_status: "paid" }, "completed")}>
                      Mark completed
                    </button>
                  )}
                  {o.status === "completed" && (
                    <button disabled={busy} className="btn-sm" onClick={() => act(o, { status: "pending" }, "moved back to pending")}>
                      Move back to pending
                    </button>
                  )}
                </div>
                {isPending(o) && needsReceipt(o.payment_method) && o.payment_status !== "paid" && (
                  <p className="mt-2 text-[11px] text-earth-600">Check your Messenger for the customer’s {METHOD_LABEL[o.payment_method]} payment screenshot.</p>
                )}
              </article>
            )
          })}
        </div>
      )}

      <Modal open={!!receipt} onClose={() => setReceipt(null)} label="Payment receipt">
        {receipt && (
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">{receipt.code}</p>
                <p className="text-xs text-earth-600">Expected amount: {peso(receipt.total)}</p>
              </div>
              <button onClick={() => setReceipt(null)} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-earth-100">
                <Icon name="close" size={16} />
              </button>
            </div>
            <img src={receipt.receipt_url} alt="Payment receipt" className="max-h-[65svh] w-full rounded-xl object-contain" />
          </div>
        )}
      </Modal>
    </div>
  )
}

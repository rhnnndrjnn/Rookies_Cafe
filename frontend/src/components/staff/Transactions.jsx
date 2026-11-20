import { useMemo, useState } from "react"
import { Icon } from "../ui.jsx"
import { METHOD_LABEL, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL, fmtDateTime, peso } from "../../lib/constants.js"
import { PanelHeader } from "./Shell.jsx"
import { deleteOrder } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"

const RANGES = [
  { id: "today", label: "Today", days: 0 },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "all", label: "All time", days: null },
]

export default function TransactionsPanel({ orders }) {
  const notify = useNotify()
  const [range, setRange] = useState("today")
  const [q, setQ] = useState("")

  const del = async (o) => {
    if (!window.confirm(`Delete transaction ${o.code} (${o.customer_name}, ${peso(o.total)})? This can't be undone.`)) return
    try {
      await deleteOrder(o.id)
      notify("Transaction deleted", o.code)
    } catch (e) {
      notify("Could not delete", e.message, { tone: "error" })
    }
  }
  const delAll = async () => {
    if (!rows.length || !window.confirm(`Delete all ${rows.length} transactions shown here? This can't be undone.`)) return
    try {
      await Promise.all(rows.map((o) => deleteOrder(o.id)))
      notify("Transactions deleted", `${rows.length} removed`)
    } catch (e) {
      notify("Could not delete", e.message, { tone: "error" })
    }
  }

  const rows = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    if (r.days) start.setDate(start.getDate() - r.days)
    return orders.filter((o) => {
      if (r.days !== null && new Date(o.created_at) < start) return false
      const s = q.trim().toLowerCase()
      return !s || `${o.code} ${o.customer_name}`.toLowerCase().includes(s)
    })
  }, [orders, range, q])

  const paid = rows.filter((o) => o.payment_status === "paid" && o.status !== "cancelled")
  const sum = (list) => list.reduce((n, o) => n + Number(o.total), 0)
  const stats = [
    { label: "Sales (paid)", value: peso(sum(paid)) },
    { label: "Cash", value: peso(sum(paid.filter((o) => o.payment_method === "cash"))) },
    { label: "GCash", value: peso(sum(paid.filter((o) => o.payment_method === "gcash"))) },
    { label: "QRPh", value: peso(sum(paid.filter((o) => o.payment_method === "qrph"))) },
    { label: "Orders", value: rows.length },
  ]

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const lines = [
      ["Date", "Code", "Customer", "Type", "Method", "Payment", "Status", "Items", "Total"].join(","),
      ...rows.map((o) =>
        [
          new Date(o.created_at).toLocaleString("en-PH"),
          o.code,
          o.customer_name,
          ORDER_TYPE_LABEL[o.order_type] || "",
          o.payment_method,
          o.payment_status,
          o.status,
          o.items.map((l) => `${l.qty}x ${l.name}`).join("; "),
          Number(o.total).toFixed(2),
        ].map(esc).join(","),
      ),
    ]
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `Rookies-Cafe-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PanelHeader eyebrow="Records" title="Transactions">
        <button className="btn-sm" onClick={exportCsv} disabled={!rows.length}>
          <Icon name="upload" size={14} /> Export CSV
        </button>
        <button className="btn-sm danger" onClick={delAll} disabled={!rows.length}>
          <Icon name="trash" size={14} /> Delete shown
        </button>
      </PanelHeader>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-earth-600">{s.label}</p>
            <p className="display-title mt-2 truncate text-xl sm:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="no-scrollbar mb-4 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button key={r.id} onClick={() => setRange(r.id)} className={`chip ${range === r.id ? "chip-active" : ""}`}>
            {r.label}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or name" className="input-box w-full rounded-full sm:ml-auto sm:max-w-[220px]" aria-label="Search transactions" />
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.length === 0 && (
          <li className="rounded-2xl border border-earth-300 bg-earth-50 px-5 py-12 text-center text-sm text-earth-600">No transactions in this range.</li>
        )}
        {rows.map((o) => (
          <li key={o.id} className="rounded-2xl border border-earth-300 bg-earth-50 p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{o.code}</p>
                <p className="truncate text-sm">{o.customer_name}</p>
                <p className="text-[11px] text-earth-600">{fmtDateTime(o.created_at)}</p>
              </div>
              <strong className="shrink-0">{peso(o.total)}</strong>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge">{ORDER_TYPE_LABEL[o.order_type] || "—"}</span>
              <span className="badge">{METHOD_LABEL[o.payment_method] || o.payment_method}</span>
              <span className={`badge ${o.payment_status}`}>{PAYMENT_LABEL[o.payment_status]}</span>
              <span className={`badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
              <button className="btn-sm danger ml-auto" onClick={() => del(o)} aria-label={`Delete ${o.code}`}>
                <Icon name="trash" size={14} /> Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-earth-300 bg-earth-50 shadow-sm md:block">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr><th>Date</th><th>Code</th><th>Customer</th><th>Type</th><th>Method</th><th>Payment</th><th>Status</th><th className="text-right">Total</th><th><span className="sr-only">Delete</span></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-earth-600">No transactions in this range.</td></tr>
            )}
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap">{fmtDateTime(o.created_at)}</td>
                <td className="whitespace-nowrap font-semibold">{o.code}</td>
                <td>{o.customer_name}</td>
                <td>{ORDER_TYPE_LABEL[o.order_type] || "—"}</td>
                <td>{METHOD_LABEL[o.payment_method] || o.payment_method}</td>
                <td><span className={`badge ${o.payment_status}`}>{PAYMENT_LABEL[o.payment_status]}</span></td>
                <td><span className={`badge ${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                <td className="text-right font-semibold">{peso(o.total)}</td>
                <td className="text-right">
                  <button className="btn-sm danger" onClick={() => del(o)} aria-label={`Delete ${o.code}`}>
                    <Icon name="trash" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

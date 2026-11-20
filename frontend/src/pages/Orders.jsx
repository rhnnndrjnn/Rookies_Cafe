import { useState } from "react"
import { Icon, PageLink, Spinner } from "../components/ui.jsx"
import { METHOD_LABEL, ORDER_TYPE_LABEL, PAYMENT_LABEL, fmtDateTime, lineSummary, messengerUrl, needsReceipt, peso } from "../lib/constants.js"

const STEPS = ["pending", "completed"]

function OrderCard({ order, onDelete }) {
  // older orders may still carry preparing / ready — they count as pending
  const done = order.status === "completed"
  const cancelled = order.status === "cancelled"
  const step = done ? 1 : 0
  const isDelivery = order.order_type === "delivery"

  return (
    <article className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="display-title text-2xl">{order.code}</p>
          <p className="mt-1 text-xs text-earth-600">
            Placed {fmtDateTime(order.created_at)} · {ORDER_TYPE_LABEL[order.order_type] || "Pick up"} ·{" "}
            {isDelivery ? "delivery" : "arrival"} {fmtDateTime(order.arrival_time)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${cancelled ? "cancelled" : done ? "completed" : "pending"}`}>
            {cancelled ? "Cancelled" : done ? "Completed" : "Pending"}
          </span>
          <span className={`badge ${order.payment_status}`}>
            {METHOD_LABEL[order.payment_method] || order.payment_method} · {PAYMENT_LABEL[order.payment_status]}
          </span>
        </div>
      </div>

      {!cancelled && (
        <ol className="mt-5 grid grid-cols-2 gap-2 text-center text-[10px] font-bold uppercase tracking-[.08em]">
          {STEPS.map((s, i) => (
            <li key={s}>
              <span className={`block h-1.5 rounded-full ${i <= step ? "bg-earth-700" : "bg-earth-200"}`} />
              <span className={`mt-2 block ${i <= step ? "text-earth-900" : "text-earth-500"}`}>
                {s === "pending" ? "Pending" : "Completed"}
              </span>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-5 divide-y divide-earth-200 text-sm">
        {order.items.map((l, i) => (
          <li key={i} className="flex justify-between gap-3 py-2.5">
            <span>
              <strong>{l.qty}× {l.name}</strong>
              <span className="block text-[11px] text-earth-600">{lineSummary(l)}</span>
            </span>
            <span className="font-semibold">{peso(l.qty * l.unitPrice)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t border-earth-300 pt-3 font-semibold">
        <span>Total</span>
        <span>{peso(order.total)}</span>
      </p>

      {isDelivery && order.delivery_address && (
        <p className="mt-4 rounded-xl bg-earth-100 p-3 text-xs leading-5 text-earth-700">
          <strong>Deliver to:</strong> {order.delivery_address}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="btn-sm danger"
          onClick={() =>
            window.confirm(
              done || cancelled
                ? `Delete order ${order.code} from your list?`
                : `Order ${order.code} is still pending. Delete it from your list anyway? The cafe will still have your order.`,
            ) && onDelete(order.code)
          }
        >
          Delete order
        </button>
      </div>
      {!done && !cancelled && (
        <p className="mt-4 rounded-xl bg-earth-100 p-3 text-xs leading-5 text-earth-700">
          {needsReceipt(order.payment_method)
            ? `Send your order and ${METHOD_LABEL[order.payment_method]} payment screenshot on Messenger so we can confirm it. `
            : "Make sure you’ve sent your order on Messenger so we can confirm it. "}
          <a href={messengerUrl()} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
            Open Messenger
          </a>
        </p>
      )}
    </article>
  )
}

export default function OrdersPage({ navigate, myOrders }) {
  const { orders, loading, track, remove } = myOrders
  const [code, setCode] = useState("")

  return (
    <main className="min-h-[70vh] bg-earth-200">
      <section className="border-b border-earth-300 bg-earth-100 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto flex max-w-[1040px] flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Follow your order</p>
            <h1 className="display-title mt-3 text-6xl tracking-[-.05em] sm:text-7xl">My orders</h1>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim()) track(code).then(() => setCode(""))
            }}
            className="flex w-full gap-2 sm:w-96"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Have an order code? ROOK-1106-1234"
              className="input-box rounded-full"
              aria-label="Order code"
            />
            <button className="btn-sm solid shrink-0">Track</button>
          </form>
        </div>
      </section>
      <section className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1040px] space-y-5">
          {loading ? (
            <Spinner />
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-earth-300 bg-earth-50 px-5 py-20 text-center shadow-md">
              <p className="font-semibold">No orders on this device yet.</p>
              <p className="mt-2 text-sm text-earth-600">Orders you place here will show up so you can follow them.</p>
              <PageLink to="/menu" navigate={navigate} className="primary-button mt-7">
                Order from the menu <Icon name="arrow" size={17} />
              </PageLink>
            </div>
          ) : (
            orders.map((o) => <OrderCard key={o.id} order={o} onDelete={remove} />)
          )}
        </div>
      </section>
    </main>
  )
}

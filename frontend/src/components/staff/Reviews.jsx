import { useEffect, useMemo, useState } from "react"
import { Icon } from "../ui.jsx"
import { deleteMessage, markMessage, setReviewPublic } from "../../lib/db.js"
import { fmtDateTime } from "../../lib/constants.js"
import { RATING_FIELDS, RATING_WORDS, averageRating, parseReview } from "../../lib/reviews.js"
import { isVoucherUsed, orderVoucher } from "../../lib/voucher.js"
import { useNotify } from "../../lib/notify.jsx"
import { PanelHeader } from "./Shell.jsx"

function Stars({ value, size = 15 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9z"
            fill={n <= Math.round(value) ? "#E0A528" : "none"}
            stroke={n <= Math.round(value) ? "#C58C12" : "#A89488"}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

export default function ReviewsPanel({ messages, orders, canDelete }) {
  const notify = useNotify()
  const reviews = useMemo(
    () => messages.map((m) => ({ ...m, parsed: parseReview(m) })).filter((m) => m.parsed),
    [messages],
  )
  const [openId, setOpenId] = useState(null)

  // voucher code -> the order that spent it (orders carry the code in their note)
  const usedBy = useMemo(() => {
    const map = new Map()
    orders.forEach((o) => {
      const v = orderVoucher(o)
      if (v) map.set(v.code, o)
    })
    return map
  }, [orders])

  // The real "used" lock (same one the customer sees). An order note can be missing if the order
  // failed to save or the owner deleted that transaction, so don't rely on orders alone.
  const [lockUsed, setLockUsed] = useState({})
  const codesKey = reviews.map((r) => r.parsed.voucher).filter(Boolean).join(",")
  useEffect(() => {
    let alive = true
    const codes = codesKey ? codesKey.split(",") : []
    Promise.all(codes.map((c) => isVoucherUsed(c).then((u) => [c, u]).catch(() => [c, null]))).then((pairs) => {
      if (alive) setLockUsed(Object.fromEntries(pairs))
    })
    return () => {
      alive = false
    }
  }, [codesKey, orders.length])
  const isUsed = (code) => usedBy.has(code) || lockUsed[code] === true

  const unread = reviews.filter((r) => !r.read).length
  const overall = averageRating(reviews, "overall")
  const shownCount = reviews.filter((r) => r.show_public).length
  const usedCount = reviews.filter((r) => r.parsed.voucher && isUsed(r.parsed.voucher)).length

  const toggle = async (r) => {
    setOpenId(openId === r.id ? null : r.id)
    if (!r.read) await markMessage(r.id, true)
  }
  const togglePublic = async (r) => {
    const next = !r.show_public
    try {
      await setReviewPublic(r.id, next)
      notify(next ? "Added to the customer page" : "Hidden from the customer page", next ? "Customers can now see this review." : "", { tone: "success" })
    } catch (e) {
      notify("Could not update", e.message, { tone: "error" })
    }
  }
  const remove = async (r) => {
    if (!window.confirm("Delete this review? The customer's voucher stays locked, so they can't claim another.")) return
    try {
      await deleteMessage(r.id)
      notify("Review deleted")
    } catch (e) {
      notify("Could not delete", e.message, { tone: "error" })
    }
  }

  return (
    <div>
      <PanelHeader eyebrow="Private · owner only" title="Reviews & Feedback">
        <span className="badge">{unread} new</span>
      </PanelHeader>

      <p className="mb-4 rounded-xl bg-earth-100 p-3 text-xs leading-5 text-earth-700">
        <strong>On the customer page: {shownCount} of {reviews.length}.</strong> Customers only see the reviews you switch on
        (open a review and press “Show on customer page”). Their average and comments on the Feedback page are built from those reviews only;
        the numbers below count every review.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-earth-600">Overall average</p>
          <p className="display-title mt-2 text-2xl sm:text-3xl">{reviews.length ? overall.toFixed(1) : "—"}<span className="text-base text-earth-600"> / 5</span></p>
          {reviews.length > 0 && <Stars value={overall} />}
        </div>
        <div className="rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-earth-600">Reviews</p>
          <p className="display-title mt-2 text-2xl sm:text-3xl">{reviews.length}</p>
        </div>
        <div className="rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-earth-600">Vouchers given</p>
          <p className="display-title mt-2 text-2xl sm:text-3xl">{reviews.filter((r) => r.parsed.voucher).length}</p>
        </div>
        <div className="rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-earth-600">Vouchers used</p>
          <p className="display-title mt-2 text-2xl sm:text-3xl">{usedCount}</p>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="mb-5 grid gap-2 rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          {RATING_FIELDS.map((f) => (
            <div key={f.id}>
              <p className="text-[10px] font-bold uppercase tracking-[.1em] text-earth-600">{f.label}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                <Stars value={averageRating(reviews, f.id)} size={13} /> {averageRating(reviews, f.id).toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-earth-300 bg-earth-50 px-5 py-16 text-center text-sm text-earth-600">
          No reviews yet. Customers can leave one on the Feedback page and receive a ₱100 voucher.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-sm">
          {reviews.map((r) => {
            const order = r.parsed.voucher ? usedBy.get(r.parsed.voucher) : null
            return (
              <li key={r.id} className="border-b border-earth-200 last:border-b-0">
                <button onClick={() => toggle(r)} className={`flex w-full items-start gap-3 p-4 text-left hover:bg-earth-100 ${r.read ? "" : "bg-earth-100/60"}`}>
                  <span className={`mt-2 size-2 shrink-0 rounded-full ${r.read ? "bg-transparent" : "bg-[#B5564A]"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <strong className="text-sm">{r.name}</strong>
                      <span className="text-[11px] text-earth-600">{fmtDateTime(r.created_at)}</span>
                    </span>
                    <span className="block text-xs text-earth-600">{r.email}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <Stars value={r.parsed.ratings.overall || 0} />
                      <span className="text-xs font-semibold">{RATING_WORDS[r.parsed.ratings.overall] || ""}</span>
                      {r.show_public && <span className="badge completed">👁 On customer page</span>}
                      {r.parsed.voucher && (
                        <span className={`badge ${isUsed(r.parsed.voucher) ? "cancelled" : "completed"}`}>
                          🎟 {order
                            ? `Voucher used · ${order.code}`
                            : isUsed(r.parsed.voucher)
                              ? "Voucher used · order record not found"
                              : "Voucher not used yet"}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
                {openId === r.id && (
                  <div className="px-3 pb-4 sm:pl-9 sm:pr-4">
                    <div className="grid gap-2 rounded-xl bg-white/60 p-4 sm:grid-cols-2">
                      {RATING_FIELDS.map((f) => (
                        <p key={f.id} className="flex items-center justify-between gap-3 text-sm">
                          <span>{f.label}</span>
                          <Stars value={r.parsed.ratings[f.id] || 0} />
                        </p>
                      ))}
                    </div>
                    {r.parsed.comment && (
                      <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white/60 p-4 text-sm leading-6">{r.parsed.comment}</p>
                    )}
                    {r.parsed.voucher && <p className="mt-2 break-all text-xs text-earth-600">Voucher code: <strong>{r.parsed.voucher}</strong></p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="btn-sm solid" href={`mailto:${r.email}?subject=${encodeURIComponent("Thank you for your review — Rookies Cafe Teresa Rizal")}`}>
                        <Icon name="mail" size={14} /> Reply by email
                      </a>
                      <button
                        className={`btn-sm ${r.show_public ? "" : "solid"}`}
                        onClick={() => togglePublic(r)}
                        aria-pressed={!!r.show_public}
                      >
                        <Icon name="eye" size={14} /> {r.show_public ? "Hide from customer page" : "Show on customer page"}
                      </button>
                      <button className="btn-sm" onClick={() => markMessage(r.id, false)}>Mark new</button>
                      {canDelete && (
                        <button className="btn-sm danger" onClick={() => remove(r)}>
                          <Icon name="trash" size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

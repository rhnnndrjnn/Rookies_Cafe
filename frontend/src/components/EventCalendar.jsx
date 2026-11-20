import { useMemo, useState } from "react"
import { Icon } from "./ui.jsx"
import { BOOKING_MAX_MONTHS, fmtDay, parseYmd, ymd } from "../lib/constants.js"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/**
 * Month calendar showing which days are free for events.
 *
 *  mode="customer"  free days are selectable; booked / closed days and anything before
 *                   `minDate` are disabled. Customers only ever see "Booked" — never who booked.
 *  mode="owner"     every day is clickable; days are coloured by booking status
 *                   (free · pending request · confirmed · blocked).
 *
 * statusByDate: { "YYYY-MM-DD": "pending" | "confirmed" | "blocked" }
 */
export default function EventCalendar({
  statusByDate = {},
  selected = null,
  onSelect,
  mode = "customer",
  minDate,
  countByDate = {},
}) {
  const today = ymd(new Date())
  const startMonth = useMemo(() => {
    const d = selected ? parseYmd(selected) : parseYmd(minDate || today)
    return { y: d.getFullYear(), m: d.getMonth() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [cursor, setCursor] = useState(startMonth)

  const now = new Date()
  const monthsFromNow = (cursor.y - now.getFullYear()) * 12 + (cursor.m - now.getMonth())
  const canPrev = mode === "owner" ? monthsFromNow > -24 : monthsFromNow > 0
  const canNext = monthsFromNow < (mode === "owner" ? 36 : BOOKING_MAX_MONTHS)

  const go = (delta) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay()
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  })

  const stateFor = (key) => {
    const st = statusByDate[key]
    if (mode === "customer") {
      if (key < (minDate || today)) return { cls: "past", disabled: true, text: "", say: "not available" }
      if (st === "blocked") return { cls: "taken", disabled: true, text: "Closed", say: "closed" }
      if (st) return { cls: "taken", disabled: true, text: "Booked", say: "already booked" }
      return { cls: "free", disabled: false, text: "Open", say: "available" }
    }
    // owner view
    if (st === "pending") return { cls: "pending", disabled: false, text: "Request", say: "pending request" }
    if (st === "confirmed") return { cls: "confirmed", disabled: false, text: "Booked", say: "confirmed event" }
    if (st === "blocked") return { cls: "blocked", disabled: false, text: "Blocked", say: "blocked" }
    if (key < today) return { cls: "past", disabled: false, text: "", say: "past day, no event" }
    return { cls: "free", disabled: false, text: "Free", say: "free" }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="grid size-10 place-items-center rounded-full border border-earth-300 transition hover:bg-earth-100 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <p className="display-title text-xl sm:text-2xl" aria-live="polite">
          {title}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="grid size-10 place-items-center rounded-full border border-earth-300 transition hover:bg-earth-100 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      <div className="cal-grid" role="grid" aria-label={title}>
        {DOW.map((d) => (
          <div key={d} className="cal-dow" role="columnheader">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDow }, (_, i) => (
          <div key={"b" + i} className="cal-day outside" aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const key = ymd(new Date(cursor.y, cursor.m, day))
          const st = stateFor(key)
          const isSel = selected === key
          const extra = mode === "owner" ? countByDate[key] : 0
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              disabled={st.disabled}
              aria-pressed={isSel}
              aria-label={`${fmtDay(key)} — ${st.say}`}
              onClick={() => onSelect?.(key)}
              className={`cal-day ${st.cls} ${key === today ? "today" : ""} ${isSel ? "selected" : ""}`}
            >
              <span>{day}</span>
              {st.text && <small>{st.text}</small>}
              {extra > 1 && <small>+{extra - 1}</small>}
            </button>
          )
        })}
      </div>

      <div className="cal-legend mt-5" aria-hidden="true">
        {mode === "customer" ? (
          <>
            <span><i style={{ background: "#EAF5EC", borderColor: "#B9D8BE" }} />Available</span>
            <span><i style={{ background: "var(--earth-200)" }} />Booked / closed</span>
            <span><i style={{ background: "var(--earth-700)", borderColor: "var(--earth-700)" }} />Your pick</span>
          </>
        ) : (
          <>
            <span><i style={{ background: "#EAF5EC", borderColor: "#B9D8BE" }} />Free</span>
            <span><i style={{ background: "#F8EBC6", borderColor: "#E4CC87" }} />Pending request</span>
            <span><i style={{ background: "#CFE7D3", borderColor: "#7FB88A" }} />Confirmed</span>
            <span><i style={{ background: "var(--earth-300)" }} />Blocked</span>
          </>
        )}
      </div>
    </div>
  )
}

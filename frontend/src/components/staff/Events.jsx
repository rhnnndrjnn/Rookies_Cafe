import { useMemo, useState } from "react"
import EventCalendar from "../EventCalendar.jsx"
import { Icon } from "../ui.jsx"
import { PanelHeader } from "./Shell.jsx"
import {
  BOOKING_HOLDS_DAY,
  BOOKING_STATUS_LABEL,
  fmtDateTime,
  fmtDay,
  pesoWhole,
  PACKAGES,
  ymd,
} from "../../lib/constants.js"
import { blockDate, deleteBooking, setBookingStatus } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"

const byDate = (a, b) => (a.event_date > b.event_date ? 1 : a.event_date < b.event_date ? -1 : 0)

function Detail({ label, children }) {
  if (!children) return null
  return (
    <div>
      <dt className="opt-label">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold">{children}</dd>
    </div>
  )
}

function BookingCard({ b, busy, onAct, onUnblock }) {
  const price = PACKAGES.find((p) => p.name === b.package)
  if (b.status === "blocked")
    return (
      <article className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">This day is closed to bookings</p>
          <span className="badge blocked">Blocked</span>
        </div>
        {b.notes && <p className="mt-2 text-sm text-earth-600">Reason: {b.notes}</p>}
        <button disabled={busy} className="btn-sm mt-4" onClick={() => onUnblock(b)}>
          Reopen this day
        </button>
      </article>
    )

  return (
    <article className="min-w-0 rounded-2xl border border-earth-300 bg-earth-50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="display-title text-xl">{b.customer_name}</p>
          <p className="mt-0.5 text-xs text-earth-600">
            {b.code} · requested {fmtDateTime(b.created_at)}
          </p>
        </div>
        <span className={`badge ${b.status}`}>{BOOKING_STATUS_LABEL[b.status]}</span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Detail label="Mobile">
          <a className="underline underline-offset-4" href={`tel:${b.phone}`}>{b.phone}</a>
        </Detail>
        <Detail label="Email">
          {b.email && <a className="break-all underline underline-offset-4" href={`mailto:${b.email}`}>{b.email}</a>}
        </Detail>
        <Detail label="Event">{b.event_type}</Detail>
        <Detail label="Package">
          {b.package ? `${b.package}${price ? ` · ${pesoWhole(price.price)}` : ""}` : ""}
        </Detail>
        <Detail label="Guests">{b.guests}</Detail>
        <div className="sm:col-span-2"><Detail label="Event place">{b.venue}</Detail></div>
      </dl>
      {b.notes && (
        <p className="mt-4 rounded-xl bg-earth-100 p-3 text-sm leading-6 text-earth-700">{b.notes}</p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-2 border-t border-earth-200 pt-4 min-[420px]:flex min-[420px]:flex-wrap">
        {b.status === "pending" && (
          <>
            <button
              disabled={busy}
              className="btn-sm solid"
              onClick={() => onAct(b, "confirmed", "booking confirmed")}
            >
              <Icon name="check" size={14} /> Confirm booking
            </button>
            <button
              disabled={busy}
              className="btn-sm danger"
              onClick={() => onAct(b, "declined", "booking declined")}
            >
              Decline
            </button>
          </>
        )}
        {b.status === "confirmed" && (
          <button
            disabled={busy}
            className="btn-sm danger"
            onClick={() =>
              window.confirm(`Cancel ${b.customer_name}'s booking? The day becomes free again.`) &&
              onAct(b, "cancelled", "booking cancelled")
            }
          >
            Cancel booking
          </button>
        )}
        {(b.status === "declined" || b.status === "cancelled") && (
          <p className="text-xs text-earth-600">This request is closed — the day is free again.</p>
        )}
      </div>
    </article>
  )
}

export default function EventsPanel({ bookings }) {
  const notify = useNotify()
  const today = ymd(new Date())
  const [selected, setSelected] = useState(today)
  const [reason, setReason] = useState("")
  const [busyId, setBusyId] = useState(null)

  const { statusByDate, pending, upcoming, blockedAhead } = useMemo(() => {
    const active = bookings.filter((b) => BOOKING_HOLDS_DAY.includes(b.status))
    return {
      statusByDate: Object.fromEntries(active.map((b) => [b.event_date, b.status])),
      pending: bookings.filter((b) => b.status === "pending").sort(byDate),
      upcoming: bookings.filter((b) => b.status === "confirmed" && b.event_date >= today).sort(byDate),
      blockedAhead: bookings.filter((b) => b.status === "blocked" && b.event_date >= today).length,
    }
  }, [bookings, today])

  const dayBookings = bookings
    .filter((b) => b.event_date === selected)
    .sort((a, b) => Number(BOOKING_HOLDS_DAY.includes(b.status)) - Number(BOOKING_HOLDS_DAY.includes(a.status)))
  const dayActive = dayBookings.find((b) => BOOKING_HOLDS_DAY.includes(b.status))
  const dayHistory = dayBookings.filter((b) => !BOOKING_HOLDS_DAY.includes(b.status))
  const isFree = !dayActive && selected >= today

  const act = async (b, status, text) => {
    setBusyId(b.id)
    try {
      await setBookingStatus(b, status, text)
      notify(`Booking ${BOOKING_STATUS_LABEL[status].toLowerCase()}`, `${b.customer_name} · ${fmtDay(b.event_date, { month: "short", day: "numeric" })}`, { tone: "success" })
    } catch (e) {
      notify("Could not update the booking", e.message, { tone: "error" })
    } finally {
      setBusyId(null)
    }
  }

  const block = async () => {
    setBusyId("block")
    try {
      await blockDate(selected, reason.trim())
      setReason("")
      notify("Day blocked", fmtDay(selected), { tone: "success" })
    } catch (e) {
      notify("Could not block the day", e.message, { tone: "error" })
    } finally {
      setBusyId(null)
    }
  }

  const unblock = async (b) => {
    setBusyId(b.id)
    try {
      await deleteBooking(b.id)
      notify("Day reopened", fmtDay(b.event_date), { tone: "success" })
    } catch (e) {
      notify("Could not reopen the day", e.message, { tone: "error" })
    } finally {
      setBusyId(null)
    }
  }

  const stats = [
    { label: "Pending requests", value: pending.length },
    { label: "Confirmed events", value: upcoming.length },
    { label: "Days blocked", value: blockedAhead },
  ]

  return (
    <div>
      <PanelHeader eyebrow="Mobile coffee cart" title="Event bookings" />

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 rounded-2xl border border-earth-300 bg-earth-50 p-3 shadow-sm sm:p-4">
            <p className="text-[9px] font-bold uppercase leading-4 tracking-[.1em] text-earth-600 sm:text-[10px] sm:tracking-[.14em]">{s.label}</p>
            <p className="display-title mt-2 text-2xl sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="h-fit min-w-0 rounded-2xl border border-earth-300 bg-earth-50 p-3 shadow-sm sm:p-6">
          <EventCalendar mode="owner" statusByDate={statusByDate} selected={selected} onSelect={setSelected} />
          <p className="mt-4 text-xs leading-5 text-earth-600">
            Green days are free for events. Tap any day to see who booked it, or to close it.
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          <p className="eyebrow">{fmtDay(selected)}</p>

          {dayActive && (
            <BookingCard b={dayActive} busy={busyId === dayActive.id} onAct={act} onUnblock={unblock} />
          )}

          {isFree && (
            <div className="rounded-2xl border border-[#B9D8BE] bg-[#EAF5EC] p-5">
              <p className="font-semibold text-[#1F5A2B]">This day is free for events.</p>
              <p className="mt-1 text-sm text-[#1F5A2B]/80">Customers can book it from the website calendar.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={80}
                  placeholder="Reason (optional) — e.g. day off"
                  aria-label="Reason for blocking this day"
                  className="input-box min-w-0 flex-1 rounded-full"
                />
                <button disabled={busyId === "block"} className="btn-sm" onClick={block}>
                  {busyId === "block" ? "Blocking…" : "Block this day"}
                </button>
              </div>
            </div>
          )}

          {!dayActive && !isFree && (
            <p className="rounded-2xl border border-earth-300 bg-earth-50 p-5 text-sm text-earth-600">
              No event on this day.
            </p>
          )}

          {dayHistory.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Closed requests for this day</p>
              <ul className="space-y-2">
                {dayHistory.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-earth-300 bg-earth-50 px-4 py-3 text-sm">
                    <span><strong>{b.customer_name}</strong> · {b.code}</span>
                    <span className={`badge ${b.status}`}>{BOOKING_STATUS_LABEL[b.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:mt-8 lg:grid-cols-2">
        <section>
          <p className="eyebrow mb-2">Needs your answer</p>
          <ul className="overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-sm">
            {pending.length === 0 && <li className="px-5 py-10 text-center text-sm text-earth-600">No pending requests.</li>}
            {pending.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setSelected(b.event_date)}
                  className="flex w-full items-center justify-between gap-3 border-b border-earth-200 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-earth-100"
                >
                  <span>
                    <strong>{b.customer_name}</strong>
                    <span className="block text-xs text-earth-600">{b.event_type} · {b.package}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">{fmtDay(b.event_date, { month: "short", day: "numeric", year: "numeric" })}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="eyebrow mb-2">Upcoming confirmed events</p>
          <ul className="overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-sm">
            {upcoming.length === 0 && <li className="px-5 py-10 text-center text-sm text-earth-600">Nothing confirmed yet.</li>}
            {upcoming.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setSelected(b.event_date)}
                  className="flex w-full items-center justify-between gap-3 border-b border-earth-200 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-earth-100"
                >
                  <span>
                    <strong>{b.customer_name}</strong>
                    <span className="block text-xs text-earth-600">{b.event_type} · {b.guests} guests</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">{fmtDay(b.event_date, { month: "short", day: "numeric", year: "numeric" })}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

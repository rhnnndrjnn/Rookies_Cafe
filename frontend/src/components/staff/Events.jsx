import { useMemo, useState } from "react"
import EventCalendar from "../EventCalendar.jsx"
import { Icon, Modal } from "../ui.jsx"
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
import { blockDate, deleteBooking, setBookingStatus, updateBooking } from "../../lib/db.js"
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


const EDIT_STATUSES = ["pending", "confirmed", "declined", "cancelled"]

/** Owner: edit everything about a booking. */
function EditBookingForm({ booking, onClose }) {
  const notify = useNotify()
  const [f, setF] = useState({
    customer_name: booking.customer_name || "",
    phone: booking.phone || "",
    email: booking.email || "",
    event_date: String(booking.event_date).slice(0, 10),
    event_type: booking.event_type || "",
    package: booking.package || "",
    guests: booking.guests ?? "",
    venue: booking.venue || "",
    notes: booking.notes || "",
    status: booking.status,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    if (f.customer_name.trim().length < 2) return setError("Enter the customer's name.")
    if (!f.event_date) return setError("Pick the event date.")
    const guests = f.guests === "" ? null : Number(f.guests)
    if (guests !== null && (!Number.isInteger(guests) || guests < 1)) return setError("Guests must be a whole number.")
    const patch = {
      customer_name: f.customer_name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      event_date: f.event_date,
      event_type: f.event_type.trim(),
      package: f.package,
      guests,
      venue: f.venue.trim(),
      notes: f.notes.trim(),
      status: f.status,
    }
    setBusy(true)
    try {
      await updateBooking(booking, patch, "booking details updated")
      notify("Booking updated", `${patch.customer_name} · ${fmtDay(patch.event_date, { month: "short", day: "numeric" })}`, { tone: "success" })
      onClose()
    } catch (err) {
      setError(err.message || "Could not save the changes.")
    } finally {
      setBusy(false)
    }
  }

  const Field = ({ label, children, span }) => (
    <label className={`block ${span ? "sm:col-span-2" : ""}`}>
      <span className="opt-label">{label}</span>
      {children}
    </label>
  )

  return (
    <form onSubmit={submit} noValidate className="space-y-5 p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="display-title text-2xl">Edit booking</h3>
          <p className="text-xs text-earth-600">{booking.code}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-earth-100">
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name"><input className="input-box mt-2" value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} maxLength={60} /></Field>
        <Field label="Mobile"><input className="input-box mt-2" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d+]/g, ""))} maxLength={13} /></Field>
        <Field label="Email"><input type="email" className="input-box mt-2" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Event date"><input type="date" className="input-box mt-2" value={f.event_date} onChange={(e) => set("event_date", e.target.value)} /></Field>
        <Field label="Type of event"><input className="input-box mt-2" value={f.event_type} onChange={(e) => set("event_type", e.target.value)} maxLength={80} /></Field>
        <Field label="Package">
          <select className="input-box mt-2" value={f.package} onChange={(e) => set("package", e.target.value)}>
            <option value="">— none —</option>
            {PACKAGES.map((p) => <option key={p.name} value={p.name}>{p.name} · {p.guests} guests · {pesoWhole(p.price)}</option>)}
            {f.package && !PACKAGES.some((p) => p.name === f.package) && <option value={f.package}>{f.package}</option>}
          </select>
        </Field>
        <Field label="Guests"><input className="input-box mt-2" inputMode="numeric" value={f.guests} onChange={(e) => set("guests", e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
        <Field label="Status">
          <select className="input-box mt-2" value={f.status} onChange={(e) => set("status", e.target.value)}>
            {EDIT_STATUSES.map((st) => <option key={st} value={st}>{BOOKING_STATUS_LABEL[st]}</option>)}
          </select>
        </Field>
        <Field label="Event place" span><input className="input-box mt-2" value={f.venue} onChange={(e) => set("venue", e.target.value)} maxLength={300} /></Field>
        <Field label="Notes" span><textarea rows={3} className="input-box mt-2 resize-y" value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} /></Field>
      </div>
      {error && <p role="alert" className="rounded-xl bg-[#F3DEDB] p-3 text-xs text-[#8F3B31]">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-earth-200 pt-5">
        <button type="button" className="btn-sm" onClick={onClose}>Cancel</button>
        <button disabled={busy} className="btn-sm solid">{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  )
}

function BookingCard({ b, busy, onAct, onUnblock, onEdit, onDelete }) {
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
          <p className="self-center text-xs text-earth-600">Closed — the day is free again.</p>
        )}
        <button disabled={busy} className="btn-sm min-[420px]:ml-auto" onClick={() => onEdit(b)}>
          <Icon name="edit" size={14} /> Edit
        </button>
        <button disabled={busy} className="btn-sm danger" onClick={() => onDelete(b)} aria-label={`Delete booking ${b.code}`}>
          <Icon name="trash" size={14} /> Delete
        </button>
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
  const [view, setView] = useState("calendar") // calendar | requests | all
  const [editing, setEditing] = useState(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [q, setQ] = useState("")

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

  const remove = async (b) => {
    if (!window.confirm(`Delete ${b.customer_name}'s booking (${b.code}) permanently? This can't be undone.`)) return
    setBusyId(b.id)
    try {
      await deleteBooking(b.id)
      notify("Booking deleted", b.code)
    } catch (e) {
      notify("Could not delete the booking", e.message, { tone: "error" })
    } finally {
      setBusyId(null)
    }
  }

  const allRows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return bookings
      .filter((b) => b.status !== "blocked")
      .filter((b) => statusFilter === "all" || b.status === statusFilter)
      .filter((b) => !term || `${b.code} ${b.customer_name} ${b.phone} ${b.event_type} ${b.venue}`.toLowerCase().includes(term))
      .sort((a, b) => (a.event_date < b.event_date ? 1 : a.event_date > b.event_date ? -1 : 0))
  }, [bookings, statusFilter, q])

  const stats = [
    { label: "Pending requests", value: pending.length },
    { label: "Confirmed events", value: upcoming.length },
    { label: "Days blocked", value: blockedAhead },
  ]

  return (
    <div>
      <PanelHeader eyebrow="Mobile coffee cart" title="Event bookings" />

      <nav className="no-scrollbar mb-5 flex gap-2 overflow-x-auto border-b border-earth-300 pb-3" aria-label="Event bookings sections">
        {[
          { id: "calendar", label: "Calendar" },
          { id: "requests", label: "Requests", n: pending.length },
          { id: "all", label: "All bookings", n: bookings.filter((b) => b.status !== "blocked").length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`chip whitespace-nowrap ${view === t.id ? "chip-active" : ""}`}
            style={view === t.id ? { color: "#F6F1EF" } : undefined}
          >
            {t.label}
            {t.n > 0 && <span className="ml-2 rounded-full bg-[#B5564A] px-1.5 text-[10px] font-bold text-white">{t.n}</span>}
          </button>
        ))}
      </nav>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 rounded-2xl border border-earth-300 bg-earth-50 p-3 shadow-sm sm:p-4">
            <p className="text-[9px] font-bold uppercase leading-4 tracking-[.1em] text-earth-600 sm:text-[10px] sm:tracking-[.14em]">{s.label}</p>
            <p className="display-title mt-2 text-2xl sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </div>

      {view === "requests" && (
        <div className="space-y-4">
          {pending.length === 0 && (
            <p className="rounded-2xl border border-earth-300 bg-earth-50 px-5 py-14 text-center text-sm text-earth-600">No pending requests right now.</p>
          )}
          {pending.map((b) => (
            <BookingCard key={b.id} b={b} busy={busyId === b.id} onAct={act} onUnblock={unblock} onEdit={setEditing} onDelete={remove} />
          ))}
        </div>
      )}

      {view === "all" && (
        <div>
          <div className="no-scrollbar mb-4 flex flex-wrap items-center gap-2">
            {["all", ...EDIT_STATUSES].map((st) => (
              <button key={st} onClick={() => setStatusFilter(st)} className={`chip ${statusFilter === st ? "chip-active" : ""}`}>
                {st === "all" ? "All" : BOOKING_STATUS_LABEL[st]}
              </button>
            ))}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, place" aria-label="Search bookings" className="input-box w-full rounded-full sm:ml-auto sm:max-w-[240px]" />
          </div>
          <div className="space-y-4">
            {allRows.length === 0 && (
              <p className="rounded-2xl border border-earth-300 bg-earth-50 px-5 py-14 text-center text-sm text-earth-600">No bookings match.</p>
            )}
            {allRows.map((b) => (
              <div key={b.id}>
                <p className="eyebrow mb-1.5">{fmtDay(b.event_date)}</p>
                <BookingCard b={b} busy={busyId === b.id} onAct={act} onUnblock={unblock} onEdit={setEditing} onDelete={remove} />
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} wide label="Edit booking">
        {editing && <EditBookingForm key={editing.id} booking={editing} onClose={() => setEditing(null)} />}
      </Modal>

      {view === "calendar" && (<>
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
            <BookingCard b={dayActive} busy={busyId === dayActive.id} onAct={act} onUnblock={unblock} onEdit={setEditing} onDelete={remove} />
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
      </>)}
    </div>
  )
}

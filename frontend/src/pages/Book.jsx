import { useRef, useState } from "react"
import AddressFields from "../components/AddressFields.jsx"
import CopyTemplate from "../components/CopyTemplate.jsx"
import EventCalendar from "../components/EventCalendar.jsx"
import { Chip, FieldMessage, Icon, Input, PageLink, Spinner } from "../components/ui.jsx"
import {
  BOOKING_LEAD_DAYS,
  PACKAGES,
  PACKAGE_OCCASIONS,
  earliestBookable,
  fmtDay,
  makeBookingCode,
  messengerUrl,
  pesoWhole,
} from "../lib/constants.js"
import { createBooking } from "../lib/db.js"
import { useBookedDates } from "../lib/hooks.js"
import { useNotify } from "../lib/notify.jsx"
import { buildBookingMessage, copyText } from "../lib/orderMessage.js"
import { DEFAULT_PROVINCE, DEFAULT_REGION, formatAddress } from "../lib/phAddress.js"
import { rules, useLiveForm } from "../lib/validate.js"

const EVENT_TYPES = [...PACKAGE_OCCASIONS, "Other"]

const RULES = {
  date: (v) => (v ? "" : "Pick an open day on the calendar."),
  name: rules.name,
  phone: rules.phone,
  email: rules.emailOptional,
  eventType: (v) => (v ? "" : "Choose the type of event."),
  eventOther: (v, all) => {
    if (all.eventType !== "Other") return ""
    const t = String(v || "").trim()
    if (!t) return "Tell us what kind of event it is."
    if (t.length < 3) return "Please be a little more specific."
    return ""
  },
  pkg: (v) => (v ? "" : "Choose a package."),
  guests: (v) => {
    if (!String(v).trim()) return "Enter the number of guests."
    const n = Number(v)
    if (!Number.isInteger(n) || n < 10) return "At least 10 guests."
    if (n > 500) return "For more than 500 guests, please message us for a custom quote."
    return ""
  },
  venueName: (v) => {
    const t = String(v || "").trim()
    if (!t) return "Enter the venue name (or “Residence” for a home)."
    if (t.length < 3) return "Please give a fuller venue name."
    return ""
  },
  province: (v) => (v ? "" : "Choose the province."),
  city: (v) => (String(v).trim() ? "" : "Enter the city or municipality."),
  barangay: (v) => (String(v).trim() ? "" : "Enter the barangay."),
  street: (v) => {
    const t = String(v || "").trim()
    if (!t) return "Enter the building / house number and street."
    if (t.length < 4) return "Please give a fuller street address."
    return ""
  },
}

export default function BookPage({ navigate }) {
  const notify = useNotify()
  const { dates, loading, error: datesError, refresh } = useBookedDates()
  const minDate = earliestBookable()

  const [date, setDate] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [eventType, setEventType] = useState("")
  const [eventOther, setEventOther] = useState("")
  const [pkg, setPkg] = useState("")
  const [guests, setGuests] = useState("")
  const [venueName, setVenueName] = useState("")
  const [addr, setAddrState] = useState({
    region: DEFAULT_REGION,
    province: DEFAULT_PROVINCE,
    city: "",
    barangay: "",
    street: "",
    subdivision: "",
    zip: "",
    landmark: "",
  })
  const setAddr = (patch) => setAddrState((a) => ({ ...a, ...patch }))
  const codeRef = useRef(makeBookingCode())
  const [copiedText, setCopiedText] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(null)

  const f = useLiveForm(
    { date, name, phone, email, eventType, eventOther, pkg, guests, venueName, province: addr.province, city: addr.city, barangay: addr.barangay, street: addr.street },
    RULES,
  )
  const chosenPkg = PACKAGES.find((p) => p.name === pkg)
  const overCapacity = chosenPkg && Number(guests) > chosenPkg.guests
  // the picked day might get booked by someone else while this page is open
  const dayTaken = date && dates[date]

  const choosePackage = (p) => {
    setPkg(p.name)
    if (!guests) setGuests(String(p.guests))
  }

  const buildDraft = () => ({
    code: codeRef.current,
    customer_name: name.trim(),
    phone,
    email: email.trim(),
    event_date: date,
    event_type: eventType === "Other" ? `Other: ${eventOther.trim()}` : eventType,
    package: pkg,
    guests: Number(guests),
    venue: `${venueName.trim()} — ${formatAddress(addr)}`,
    notes: notes.trim(),
  })
  const templateText = f.valid && !dayTaken ? buildBookingMessage(buildDraft()) : ""
  const templateCopied = !!templateText && copiedText === templateText

  const copyTemplate = async () => {
    f.touchAll()
    if (!f.valid) return setError("Please fix the highlighted fields first.")
    setError("")
    if (await copyText(templateText)) {
      setCopiedText(templateText)
      notify("Request template copied", "Now send your request — Messenger opens next.", { tone: "success" })
    } else notify("Couldn’t copy automatically", "Press and hold the template to copy it, then tap again.", { tone: "error" })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    f.touchAll()
    if (!f.valid) return setError("Please fix the highlighted fields first.")
    if (dayTaken) return setError("That date was just taken. Please pick another day.")
    if (!templateCopied) return setError("Please copy your request template first (step 4).")
    const text = templateText
    // copy + open Messenger inside the tap so browsers allow both
    const copied = copyText(text)
    const tab = window.open("", "_blank")
    setBusy(true)
    try {
      const saved = await createBooking(buildDraft())
      const wasCopied = await copied
      if (tab) tab.location.href = messengerUrl(text)
      setDone({ ...saved, text, copied: wasCopied })
      window.scrollTo({ top: 0, behavior: "smooth" })
      notify("Booking request sent", `Your reference is ${saved.code}`, { tone: "success" })
    } catch (err) {
      tab?.close()
      setError(err.message || "Something went wrong. Please try again.")
      setDate("")
      refresh()
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <main className="min-h-[70vh] bg-earth-200 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-earth-300 bg-earth-50 p-8 text-center shadow-xl sm:p-12">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#CBE6CF] text-[#1F5A2B]">
            <Icon name="check" size={30} />
          </span>
          <p className="eyebrow mt-6">Request received</p>
          <h1 className="display-title mt-2 text-4xl">Thank you, {done.customer_name.split(" ")[0]}!</h1>
          <p className="mt-5 text-xs uppercase tracking-[.16em] text-earth-600">Booking reference</p>
          <p className="display-title mt-1 text-3xl tracking-wide">{done.code}</p>
          <dl className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
            <div className="flex justify-between gap-4"><dt className="text-earth-600">Date</dt><dd className="text-right font-semibold">{fmtDay(done.event_date, { month: "long", day: "numeric", year: "numeric" })}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-earth-600">Package</dt><dd className="font-semibold">{done.package}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-earth-600">Guests</dt><dd className="font-semibold">{done.guests}</dd></div>
          </dl>
          <p className="mt-6 text-sm leading-6 text-earth-600">
            Your day is on hold. Send your request on Messenger so the team can confirm the details and
            arrange payment — they can also reach you at <strong className="text-earth-900">{done.phone}</strong>.
            Please keep your reference number.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href={messengerUrl(done.text)} target="_blank" rel="noreferrer" className="primary-button">
              <Icon name="messenger" size={18} /> Open Messenger
            </a>
            <button
              type="button"
              className="secondary-button"
              onClick={async () => notify((await copyText(done.text)) ? "Request copied" : "Couldn’t copy automatically", "Paste it into Messenger.", { tone: "success" })}
            >
              <Icon name="copy" size={17} /> Copy request again
            </button>
          </div>
          <pre className="mt-6 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-earth-300 bg-earth-100 p-4 text-left font-sans text-xs leading-5 text-earth-800 [user-select:all]">
            {done.text}
          </pre>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PageLink to="/" navigate={navigate} className="primary-button">
              Back to home <Icon name="arrow" size={17} />
            </PageLink>
            <PageLink to="/packages" navigate={navigate} className="secondary-button">
              View packages
            </PageLink>
          </div>
        </div>
      </main>
    )

  return (
    <main className="bg-earth-200">
      <section className="border-b border-earth-300 bg-earth-100 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="eyebrow">Mobile coffee cart</p>
          <h1 className="display-title mt-3 text-6xl tracking-[-.05em] sm:text-7xl">Book your event</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-earth-600">
            Pick an open day, tell us about your celebration, and we’ll take it from there.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <form onSubmit={submit} noValidate className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* ---------------- calendar ---------------- */}
          <div className="h-fit rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-7 lg:sticky lg:top-[180px]">
            <p className="eyebrow">1 · Choose a day</p>
            <div className="mt-5">
              {loading ? (
                <Spinner />
              ) : (
                <EventCalendar
                  mode="customer"
                  statusByDate={dates}
                  selected={date}
                  onSelect={(d) => {
                    setDate(d)
                    f.blur("date")
                  }}
                  minDate={minDate}
                />
              )}
            </div>
            {datesError && (
              <p role="alert" className="mt-4 rounded-xl bg-[#F3DEDB] p-3 text-xs leading-5 text-[#8F3B31]">
                Couldn’t check availability: {datesError}
              </p>
            )}
            <div
              className={`mt-5 rounded-xl p-4 text-sm ${date ? "bg-earth-700" : "bg-earth-100"}`}
              style={date ? { color: "#F6F1EF" } : undefined}
              aria-live="polite"
            >
              {date ? (
                <>
                  <span className="block text-[10px] font-bold uppercase tracking-[.16em] opacity-75">Your date</span>
                  <strong className="mt-1 block">{fmtDay(date)}</strong>
                </>
              ) : (
                <span className="text-earth-700">No day selected yet.</span>
              )}
            </div>
            <FieldMessage error={f.shown("date")} />
            <p className="mt-4 text-xs leading-5 text-earth-600">
              One event per day. Bookings open {BOOKING_LEAD_DAYS} days ahead or more.
            </p>
          </div>

          {/* ---------------- form ---------------- */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md sm:p-8">
              <p className="eyebrow">2 · Your details</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="opt-label">Full name</span>
                  <Input
                    value={name}
                    onValue={setName}
                    onBlur={() => f.blur("name")}
                    error={f.shown("name")}
                    placeholder="Your full name"
                    autoComplete="name"
                    maxLength={60}
                    className="input-box mt-2"
                  />
                  <FieldMessage error={f.shown("name")} />
                </label>
                <label className="block">
                  <span className="opt-label">Mobile number</span>
                  <Input
                    kind="phone"
                    value={phone}
                    onValue={setPhone}
                    onBlur={() => f.blur("phone")}
                    error={f.shown("phone")}
                    placeholder="09xxxxxxxxx"
                    maxLength={11}
                    className="input-box mt-2"
                  />
                  <FieldMessage error={f.shown("phone")} hint="Numbers only · 11 digits, starts with 09" />
                </label>
              </div>
              <label className="mt-5 block">
                <span className="opt-label">Email (optional)</span>
                <Input
                  type="email"
                  value={email}
                  onValue={setEmail}
                  onBlur={() => f.blur("email")}
                  error={f.shown("email")}
                  placeholder="name@email.com"
                  autoComplete="email"
                  className="input-box mt-2"
                />
                <FieldMessage error={f.shown("email")} />
              </label>
            </div>

            <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md sm:p-8">
              <p className="eyebrow">3 · Your event</p>

              <p className="opt-label mt-5">Type of event</p>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Type of event">
                {EVENT_TYPES.map((t) => (
                  <Chip
                    key={t}
                    active={eventType === t}
                    onClick={() => {
                      setEventType(t)
                      f.blur("eventType")
                    }}
                  >
                    {t}
                  </Chip>
                ))}
              </div>
              <FieldMessage error={f.shown("eventType")} />
              {eventType === "Other" && (
                <label className="mt-4 block">
                  <span className="opt-label">What type of event?</span>
                  <Input
                    autoFocus
                    value={eventOther}
                    onValue={setEventOther}
                    onBlur={() => f.blur("eventOther")}
                    error={f.shown("eventOther")}
                    placeholder="e.g. Reunion, Graduation party, Product launch"
                    maxLength={60}
                    className="input-box mt-2"
                  />
                  <FieldMessage error={f.shown("eventOther")} />
                </label>
              )}

              <p className="opt-label mt-6">Package</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Package">
                {PACKAGES.map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    role="radio"
                    aria-checked={pkg === p.name}
                    onClick={() => {
                      choosePackage(p)
                      f.blur("pkg")
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      pkg === p.name
                        ? "border-earth-700 bg-earth-700"
                        : "border-earth-300 hover:border-earth-600"
                    }`}
                    style={pkg === p.name ? { color: "#F6F1EF" } : undefined}
                  >
                    <span className="block font-semibold">{p.name}</span>
                    <span className="mt-1 block text-xs opacity-75">{p.guests} guests</span>
                    <span className="display-title mt-2 block text-xl">{pesoWhole(p.price)}</span>
                  </button>
                ))}
              </div>
              <FieldMessage error={f.shown("pkg")} />

              <label className="mt-6 block sm:max-w-[200px]">
                <span className="opt-label">Guests</span>
                <Input
                  kind="digits"
                  value={guests}
                  onValue={setGuests}
                  onBlur={() => f.blur("guests")}
                  error={f.shown("guests")}
                  placeholder="e.g. 80"
                  maxLength={3}
                  className="input-box mt-2"
                />
                <FieldMessage
                  error={f.shown("guests")}
                  hint={
                    overCapacity
                      ? `The ${chosenPkg.name} package covers ${chosenPkg.guests} guests — we’ll quote the extra.`
                      : "Numbers only"
                  }
                />
              </label>

              <label className="mt-6 block">
                <span className="opt-label">Venue name</span>
                <Input
                  value={venueName}
                  onValue={setVenueName}
                  onBlur={() => f.blur("venueName")}
                  error={f.shown("venueName")}
                  placeholder="e.g. Villa Teresa Garden Hall, or “Residence”"
                  maxLength={80}
                  className="input-box mt-2"
                />
                <FieldMessage error={f.shown("venueName")} />
              </label>
              <AddressFields a={addr} set={setAddr} f={f} mode="event" />

              <label className="mt-5 block">
                <span className="opt-label">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Preferred flavors, event time, theme…"
                  className="input-box mt-2 resize-y"
                />
              </label>
            </div>

            {dayTaken && (
              <p role="alert" className="rounded-xl bg-[#F3DEDB] p-4 text-sm leading-6 text-[#8F3B31]">
                {fmtDay(date)} was just booked by someone else. Please pick another day.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-[#F3DEDB] p-4 text-sm leading-6 text-[#8F3B31]">
                {error}
              </p>
            )}
            <CopyTemplate
              title="4 · Copy your request template"
              hint="Copy this first, then send your request. Messenger opens right after — just paste (tap and hold → Paste) and send."
              text={templateText}
              copied={templateCopied}
              onCopy={copyTemplate}
            />
            <button
              disabled={busy || !!dayTaken || !templateCopied}
              className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="messenger" size={18} /> {busy ? "Sending request…" : "Send request on Messenger"}
            </button>
            <p className="-mt-3 text-center text-[11px] leading-4 text-earth-600">
              Your request is saved for the team and Messenger opens so you can paste it.
            </p>
          </div>
        </form>
      </section>
    </main>
  )
}

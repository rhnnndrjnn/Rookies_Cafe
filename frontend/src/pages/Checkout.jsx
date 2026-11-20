import { useMemo, useRef, useState } from "react"
import AddressFields from "../components/AddressFields.jsx"
import ClockPicker from "../components/ClockPicker.jsx"
import CopyTemplate from "../components/CopyTemplate.jsx"
import { FieldMessage, Icon, Input, Modal, PageLink } from "../components/ui.jsx"
import {
  METHOD_LABEL,
  ORDER_TYPES,
  PAYMENT_METHODS,
  lineSummary,
  makeOrderCode,
  messengerUrl,
  needsReceipt,
  peso,
} from "../lib/constants.js"
import { createOrder } from "../lib/db.js"
import { rememberOrderCode } from "../lib/cart.js"
import { useNotify } from "../lib/notify.jsx"
import { buildOrderMessage, copyText, saveImage } from "../lib/orderMessage.js"
import { DEFAULT_PROVINCE, DEFAULT_REGION, formatAddress, needsLalamove } from "../lib/phAddress.js"
import { rules, useLiveForm } from "../lib/validate.js"
import { lineProblem } from "./Cart.jsx"

const LEAD_MINUTES = 5
const STEP_MINUTES = 5

/** Arrival is available any time while the store is open, starting 5 minutes from now. */
function timeWindow() {
  const now = new Date()
  const earliest = new Date(now.getTime() + LEAD_MINUTES * 60000)
  earliest.setSeconds(0, 0)
  earliest.setMinutes(Math.ceil(earliest.getMinutes() / STEP_MINUTES) * STEP_MINUTES)
  const max = new Date(now)
  max.setHours(23, 55, 0, 0)
  return { min: earliest, max, available: earliest <= max }
}

const clockLabel = (d) => d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })

const RULES = {
  name: rules.name,
  arrival: (v) => (v ? "" : "Please choose a time."),
  // Address fields are only required for delivery — take out and dine in never need them.
  province: (v, all) => (all.orderType === "delivery" && !v ? "Choose your province." : ""),
  city: (v, all) => (all.orderType === "delivery" && !String(v).trim() ? "Enter your city or municipality." : ""),
  barangay: (v, all) => (all.orderType === "delivery" && !String(v).trim() ? "Enter your barangay." : ""),
  street: (v, all) => {
    if (all.orderType !== "delivery") return ""
    const t = String(v || "").trim()
    if (!t) return "Enter your house / unit number and street."
    if (t.length < 4) return "Please give a fuller street address."
    return ""
  },
}

/** "Select time" pop-up with the clock. OK saves the time, Cancel keeps the old one. */
function TimeDialog({ open, onClose, value, onSave, min, max, title }) {
  return (
    <Modal open={open} onClose={onClose} label={title}>
      {open && <TimeDialogBody onClose={onClose} value={value} onSave={onSave} min={min} max={max} title={title} />}
    </Modal>
  )
}
function TimeDialogBody({ onClose, value, onSave, min, max, title }) {
  const [draft, setDraft] = useState(value)
  return (
    <div className="p-5 sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[.16em] text-earth-600">Select time</p>
      <p className="display-title mt-1 text-2xl">{title}</p>
      <div className="mt-5">
        <ClockPicker value={draft} onChange={setDraft} min={min} max={max} />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-sm">
          Cancel
        </button>
        <button
          type="button"
          className="btn-sm solid"
          onClick={() => {
            onSave(draft)
            onClose()
          }}
        >
          OK
        </button>
      </div>
    </div>
  )
}

/** QR / number for GCash or QRPh, with save + copy actions. Used before and after placing the order. */
function PaymentBox({ method, info, total }) {
  const notify = useNotify()
  const isGcash = method === "gcash"
  const label = METHOD_LABEL[method]

  const copyNumber = async () =>
    notify((await copyText(info.number)) ? "GCash number copied" : "Couldn’t copy — select the number instead", info.number, {
      tone: "success",
    })
  const saveQr = async () => {
    if (await saveImage(info.qr, `Rookies-Cafe-${label}-QR.jpg`))
      notify("QR code saved", "Open your banking / e-wallet app and upload it from your photos.", { tone: "success" })
  }

  return (
    <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr]">
      <div className="mx-auto w-full max-w-[220px] sm:max-w-none">
        <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-earth-300 bg-white">
          {info.qr ? (
            <img src={info.qr} alt={`${label} QR code`} className="h-full w-full object-contain" />
          ) : (
            <p className="px-4 text-center text-xs leading-5 text-earth-600">
              {isGcash ? "GCash QR code isn’t set up yet. Use the number instead." : "QRPh code isn’t set up yet. Please choose another payment method."}
            </p>
          )}
        </div>
        {info.qr && (
          <button type="button" onClick={saveQr} className="btn-sm solid mt-3 w-full justify-center">
            <Icon name="download" size={14} /> Save QR
          </button>
        )}
      </div>
      <div>
        <dl className="space-y-3 text-sm">
          {info.name && (
            <div>
              <dt className="opt-label">Account name</dt>
              <dd className="mt-1 font-semibold">{info.name}</dd>
            </div>
          )}
          {isGcash && info.number && (
            <div>
              <dt className="opt-label">GCash number</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-3">
                <span className="font-semibold tracking-wide">{info.number}</span>
                <button type="button" onClick={copyNumber} className="btn-sm">
                  <Icon name="copy" size={14} /> Copy number
                </button>
              </dd>
            </div>
          )}
          <div>
            <dt className="opt-label">Amount to pay</dt>
            <dd className="display-title mt-1 text-2xl">{peso(total)}</dd>
          </div>
        </dl>
        <p className="mt-4 rounded-xl bg-earth-100 p-3 text-xs leading-5 text-earth-700">
          {isGcash
            ? "Pay with the QR or number, then place your order — we’ll open Messenger so you can send your payment screenshot together with your order."
            : "Open your banking or e-wallet app, choose “Scan QR / QR Ph” (or upload the saved QR), pay the exact amount, then place your order and send your screenshot in Messenger."}
        </p>
      </div>
    </div>
  )
}

function MessengerButton({ className = "primary-button", children, text = "" }) {
  return (
    <a href={messengerUrl(text)} target="_blank" rel="noreferrer" className={className}>
      <Icon name="messenger" size={18} /> {children}
    </a>
  )
}

export default function CheckoutPage({ cart, navigate, products, settings, storeOpen }) {
  const notify = useNotify()
  const win = useMemo(() => timeWindow(), [])
  const [orderType, setOrderType] = useState("take_out")
  const [name, setName] = useState("")
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
  const [timeOpen, setTimeOpen] = useState(false)
  const [method, setMethod] = useState("cash")
  const [arrivalAt, setArrivalAt] = useState(win.min)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null) // { order, text, copied }
  const [copiedAgain, setCopiedAgain] = useState(false)
  const [copiedText, setCopiedText] = useState("") // template the customer has already copied
  const codeRef = useRef(makeOrderCode())

  const arrival = win.available && storeOpen ? arrivalAt.toISOString() : ""
  const f = useLiveForm(
    { name, orderType, province: addr.province, city: addr.city, barangay: addr.barangay, street: addr.street, arrival },
    RULES,
  )

  const items = cart.selectedItems
  const total = cart.selectedTotal
  const problem = items.some((l) => lineProblem(l, products))
  const isDelivery = orderType === "delivery"
  const lalamove = isDelivery && needsLalamove(addr.province, addr.city)
  const type = ORDER_TYPES.find((t) => t.id === orderType)
  const payInfo = method === "gcash" ? settings.gcash || {} : settings.qrph || {}

  const buildDraft = () => ({
    code: codeRef.current,
    customer_name: name.trim(),
    order_type: orderType,
    delivery_address: isDelivery ? formatAddress(addr) : "",
    payment_method: method,
    arrival_time: arrivalAt.toISOString(),
    note: [note.trim(), lalamove ? "Lalamove needed (outside Teresa) — other charges may apply, confirm on Messenger" : ""].filter(Boolean).join(" · "),
    total,
    items: items.map(({ id, image, selected, ...rest }) => rest), // eslint-disable-line no-unused-vars
  })
  const templateText = f.valid && win.available ? buildOrderMessage(buildDraft(), { lalamove }) : ""
  const templateCopied = !!templateText && copiedText === templateText

  const copyTemplate = async () => {
    f.touchAll()
    if (!f.valid) return setError("Please fix the highlighted fields first.")
    setError("")
    const ok = await copyText(templateText)
    if (ok) {
      setCopiedText(templateText)
      notify("Order template copied", "Now place your order and paste it in Messenger.", { tone: "success" })
    } else notify("Couldn’t copy automatically", "Press and hold the template to copy it, then tap again.", { tone: "error" })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    f.touchAll()
    if (!f.valid) return setError("Please fix the highlighted fields first.")
    if (!templateCopied) return setError("Please copy your order template first (step 4).")
    // the page may have been open a while — make sure the chosen time is still allowed
    const fresh = timeWindow()
    if (!storeOpen || !fresh.available || arrivalAt < fresh.min) {
      setArrivalAt(fresh.min)
      return setError("That time has passed — we moved it to the earliest available time. Please check it and try again.")
    }

    const draft = buildDraft()
    const text = buildOrderMessage(draft, { lalamove })

    // Copy + open Messenger right away, while the tap still counts as a user action
    // (browsers block clipboard / pop-ups that happen after waiting on the network).
    const copied = copyText(text) // re-copy so the clipboard is certainly this order
    const tab = window.open("", "_blank")

    setBusy(true)
    try {
      const order = await createOrder(draft)
      rememberOrderCode(order.code)
      cart.removeSelected() // only what was bought leaves the cart
      const wasCopied = await copied
      if (tab) tab.location.href = messengerUrl(text)
      setDone({ order, text, copied: wasCopied, opened: !!tab, lalamove })
      window.scrollTo({ top: 0, behavior: "smooth" })
      notify("Order placed", `Code ${order.code}`, { tone: "success" })
    } catch (err) {
      tab?.close()
      setError(err.message || "Something went wrong placing your order. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const { order, text } = done
    const wantsProof = needsReceipt(order.payment_method)
    const copyAgain = async () => {
      const ok = await copyText(text)
      setCopiedAgain(ok)
      notify(ok ? "Order copied" : "Couldn’t copy automatically", ok ? "Paste it into Messenger." : "Press and hold the order text below to copy it.", {
        tone: ok ? "success" : "error",
      })
      if (ok) setTimeout(() => setCopiedAgain(false), 2500)
    }
    return (
      <main className="min-h-[70vh] bg-earth-200 px-4 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-earth-300 bg-earth-50 p-6 text-center shadow-xl sm:p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#CBE6CF] text-[#1F5A2B]">
            <Icon name="check" size={30} />
          </span>
          <p className="eyebrow mt-6">Almost done</p>
          <h1 className="display-title mt-2 text-3xl sm:text-4xl">Send your order on Messenger</h1>
          <p className="mt-3 text-sm leading-6 text-earth-600">
            {done.copied
              ? "Your order is copied. Open Messenger and paste it to confirm."
              : "Copy your order below, then paste it in Messenger to confirm."}{" "}
            {wantsProof && `Don’t forget to attach your ${METHOD_LABEL[order.payment_method]} payment screenshot.`}
          </p>
          {done.lalamove && (
            <p className="mt-4 rounded-xl border border-[#E4CC87] bg-[#F8EBC6] p-3 text-left text-xs leading-5 text-[#6B5311]">
              <strong>Lalamove needed:</strong> this address is outside Teresa, so a Lalamove rider will be
              needed and other charges may apply. Send your order on Messenger and we’ll confirm the fare
              with you.
            </p>
          )}
          <p className="mt-5 text-xs uppercase tracking-[.16em] text-earth-600">Your order code</p>
          <p className="display-title mt-1 text-2xl tracking-wide sm:text-3xl">{order.code}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <MessengerButton text={text}>Open Messenger</MessengerButton>
            <button type="button" onClick={copyAgain} className="secondary-button">
              <Icon name={copiedAgain ? "check" : "copy"} size={17} /> {copiedAgain ? "Copied!" : "Copy order again"}
            </button>
          </div>

          <pre className="mt-6 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-earth-300 bg-earth-100 p-4 text-left font-sans text-xs leading-5 text-earth-800 [user-select:all]">
            {text}
          </pre>

          {wantsProof && (
            <div className="mt-6 border-t border-earth-300 pt-6 text-left">
              <p className="eyebrow">Pay with {METHOD_LABEL[order.payment_method]}</p>
              <PaymentBox method={order.payment_method} info={payInfo} total={order.total} />
            </div>
          )}

          {cart.items.length > 0 && (
            <p className="mt-6 rounded-xl bg-earth-100 p-3 text-xs leading-5 text-earth-700">
              The items you didn’t select are still waiting in your cart.
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PageLink to="/orders" navigate={navigate} className="secondary-button">
              Track my order
            </PageLink>
            <PageLink to="/menu" navigate={navigate} className="secondary-button">
              Back to menu
            </PageLink>
          </div>
        </div>
      </main>
    )
  }

  if (items.length === 0)
    return (
      <main className="min-h-[70vh] bg-earth-200 px-5 py-20 text-center">
        <p className="font-semibold">
          {cart.items.length === 0 ? "Your cart is empty." : "No items are selected to buy."}
        </p>
        <p className="mt-2 text-sm text-earth-600">
          {cart.items.length === 0
            ? "Pick something from the menu first."
            : "Go back to your cart and tick the items you want to order."}
        </p>
        <PageLink
          to={cart.items.length === 0 ? "/menu" : "/cart"}
          navigate={navigate}
          className="primary-button mt-6"
        >
          {cart.items.length === 0 ? "Browse the menu" : "Back to cart"} <Icon name="arrow" size={17} />
        </PageLink>
      </main>
    )

  return (
    <main className="bg-earth-200">
      <section className="border-b border-earth-300 bg-earth-100 px-4 py-10 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1040px]">
          <p className="eyebrow">Order ahead · confirm on Messenger</p>
          <h1 className="display-title mt-3 text-5xl tracking-[-.05em] sm:text-7xl">Checkout</h1>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 lg:px-12 lg:py-14">
        <form
          onSubmit={submit}
          noValidate
          className="mx-auto grid max-w-[1040px] gap-6 lg:grid-cols-[1.5fr_1fr]"
        >
          <div className="min-w-0 space-y-6">
            <div className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-8">
              <p className="eyebrow">1 · How would you like it?</p>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Order type">
                {ORDER_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    role="radio"
                    aria-checked={orderType === t.id}
                    onClick={() => setOrderType(t.id)}
                    className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
                      orderType === t.id ? "border-earth-700 bg-earth-700" : "border-earth-300 hover:border-earth-600"
                    }`}
                    style={orderType === t.id ? { color: "#F6F1EF" } : undefined}
                  >
                    <Icon name={t.icon} size={20} />
                    <span className="mt-2 block text-sm font-semibold sm:text-base">{t.title}</span>
                    <span className="mt-1 hidden text-xs opacity-75 sm:block">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-8">
              <p className="eyebrow">2 · Your details</p>
              <label className="mt-5 block">
                <span className="opt-label">Name</span>
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

              {isDelivery && <AddressFields a={addr} set={setAddr} f={f} />}

              <div className="mt-5">
                <span className="opt-label">{type.timeLabel} (today)</span>
                {win.available && storeOpen ? (
                  <button
                    type="button"
                    onClick={() => setTimeOpen(true)}
                    className="input-box mt-2 flex w-full items-center justify-between gap-3 text-left"
                    aria-haspopup="dialog"
                  >
                    <span className="flex items-center gap-3">
                      <Icon name="clock" size={18} />
                      <strong className="text-base">{clockLabel(arrivalAt)}</strong>
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[.1em] text-earth-600">Change</span>
                  </button>
                ) : (
                  <p role="alert" className="mt-2 rounded-xl bg-[#F3DEDB] p-3 text-sm text-[#8F3B31]">
                    Arrival times are available while the store is open. Please check back when the store opens.
                  </p>
                )}
                {win.available && storeOpen && (
                  <TimeDialog
                    open={timeOpen}
                    onClose={() => setTimeOpen(false)}
                    value={arrivalAt}
                    onSave={setArrivalAt}
                    min={win.min}
                    max={win.max}
                    title={type.timeLabel}
                  />
                )}
              </div>

              <label className="mt-5 block">
                <span className="opt-label">Note for the team (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Allergies, special requests…"
                  className="input-box mt-2 resize-y"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-8">
              <p className="eyebrow">3 · Mode of payment</p>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Mode of payment">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    role="radio"
                    aria-checked={method === m.id}
                    onClick={() => setMethod(m.id)}
                    className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
                      method === m.id ? "border-earth-700 bg-earth-700" : "border-earth-300 hover:border-earth-600"
                    }`}
                    style={method === m.id ? { color: "#F6F1EF" } : undefined}
                  >
                    <Icon name={m.icon} size={20} />
                    <span className="mt-2 block text-sm font-semibold sm:text-base">{m.title}</span>
                    <span className="mt-1 hidden text-xs opacity-75 sm:block">{m.sub}</span>
                  </button>
                ))}
              </div>

              {method === "cash" && (
                <p className="mt-5 rounded-xl bg-earth-100 p-4 text-sm leading-6 text-earth-700">
                  Pay in cash {orderType === "delivery" ? "when your order arrives" : "at the counter"}.
                  After you place the order, we’ll open Messenger so you can send us your order.
                </p>
              )}
              {method !== "cash" && <PaymentBox method={method} info={payInfo} total={total} />}
            </div>

            <CopyTemplate
              title="4 · Copy your order template"
              hint="Copy this first, then place your order. Messenger opens right after — just paste (tap and hold → Paste) and send."
              text={templateText}
              copied={templateCopied}
              onCopy={copyTemplate}
            />
          </div>

          <aside className="h-fit min-w-0 rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-6 lg:sticky lg:top-[180px]">
            <p className="eyebrow">Your order</p>
            <ul className="mt-4 divide-y divide-earth-200">
              {items.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {l.qty}× {l.name}
                    </span>
                    <span className="block text-[11px] leading-4 text-earth-600">{lineSummary(l)}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{peso(l.qty * l.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-earth-300 pt-4">
              <span className="font-semibold">Total</span>
              <span className="display-title text-2xl">{peso(total)}</span>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-[#F3DEDB] p-3 text-xs leading-5 text-[#8F3B31]">
                {error}
              </p>
            )}
            {!storeOpen && (
              <p className="mt-4 rounded-xl bg-[#F3DEDB] p-3 text-xs leading-5 text-[#8F3B31]">
                The cafe is closed right now, so new orders can’t be placed.
              </p>
            )}
            {problem && (
              <p className="mt-4 rounded-xl bg-[#F3DEDB] p-3 text-xs leading-5 text-[#8F3B31]">
                Some selected items are unavailable. Please update your cart first.
              </p>
            )}
            <button
              disabled={busy || !storeOpen || problem || !win.available || !templateCopied}
              className="primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="messenger" size={18} /> {busy ? "Placing order…" : "Place order on Messenger"}
            </button>
            <p className="mt-3 text-center text-[11px] leading-4 text-earth-600">
              {templateCopied
                ? "Your template is copied. Messenger opens so you can paste it."
                : "Copy your order template (step 4) to unlock this button."}
            </p>
            <PageLink
              to="/cart"
              navigate={navigate}
              className="mt-3 block text-center text-xs font-semibold underline underline-offset-4"
            >
              Back to cart
            </PageLink>
          </aside>
        </form>
      </section>
    </main>
  )
}

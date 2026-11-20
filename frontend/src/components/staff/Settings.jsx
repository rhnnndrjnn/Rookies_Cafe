import { useState } from "react"
import { FieldMessage, Icon, Input } from "../ui.jsx"
import { pushNotification, setSetting, uploadImage } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { phoneOnly, rules, useLiveForm } from "../../lib/validate.js"
import { PanelHeader, Switch } from "./Shell.jsx"

/** Open / closed switch shown in the header of both portals. */
export function StoreToggle({ settings, session }) {
  const notify = useNotify()
  const open = settings.store_open?.open !== false
  const change = async (next) => {
    try {
      await setSetting("store_open", { open: next, by: session.username, at: new Date().toISOString() })
      await pushNotification({
        type: "store",
        title: `Store ${next ? "opened" : "closed"}`,
        body: `Set by ${session.username}`,
      })
    } catch (e) {
      notify("Could not update store status", e.message, { tone: "error" })
    }
  }
  return (
    <label className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-earth-300 bg-earth-50 py-1 pl-2.5 pr-1.5 text-[10px] font-bold uppercase tracking-[.06em] sm:gap-2 sm:py-1.5 sm:pl-3 sm:pr-2 sm:text-[11px] sm:tracking-[.08em]">
      <span className={`size-2 rounded-full ${open ? "bg-[#65A56E]" : "bg-[#B5564A]"}`} />
      <span className="hidden sm:inline">Store</span> {open ? "Open" : "Closed"}
      <Switch on={open} onChange={change} label="Store open" />
    </label>
  )
}

/** QR image + upload button. */
function QrPicker({ qr, alt, busy, onFile }) {
  return (
    <div>
      <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-earth-300 bg-white">
        {qr ? (
          <img src={qr} alt={alt} className="h-full w-full object-contain" />
        ) : (
          <p className="px-4 text-center text-xs text-earth-600">No QR uploaded</p>
        )}
      </div>
      <label className={`btn-sm mt-3 w-full cursor-pointer ${busy ? "opacity-60" : ""}`}>
        <Icon name="upload" size={14} /> {qr ? "Replace QR" : "Upload QR"}
        <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
    </div>
  )
}

const GCASH_RULES = {
  number: (v) => (String(v).trim() ? rules.phone(v) : ""), // blank is allowed; if filled it must be valid
}

function GcashCard({ settings }) {
  const notify = useNotify()
  const g = settings.gcash || {}
  const [name, setName] = useState(g.name || "")
  const [number, setNumber] = useState(phoneOnly(g.number || ""))
  const [qr, setQr] = useState(g.qr || "")
  const [busy, setBusy] = useState(false)
  const f = useLiveForm({ number }, GCASH_RULES)

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      setQr(await uploadImage(file, "gcash"))
    } catch (e) {
      notify("Upload failed", e.message, { tone: "error" })
    } finally {
      setBusy(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    f.touchAll()
    if (!f.valid) return
    setBusy(true)
    try {
      await setSetting("gcash", { name: name.trim(), number, qr })
      notify("GCash details saved", "Customers will see them at checkout.", { tone: "success" })
    } catch (err) {
      notify("Could not save", err.message, { tone: "error" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="grid gap-6 rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-sm sm:grid-cols-[200px_1fr] sm:p-8">
      <QrPicker qr={qr} alt="GCash QR" busy={busy} onFile={upload} />
      <div className="space-y-5">
        <p className="eyebrow">GCash</p>
        <label className="block">
          <span className="opt-label">Account name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-box mt-2" />
        </label>
        <label className="block">
          <span className="opt-label">GCash number</span>
          <Input
            kind="phone"
            value={number}
            onValue={setNumber}
            onBlur={() => f.blur("number")}
            error={f.shown("number")}
            placeholder="09xxxxxxxxx"
            maxLength={11}
            className="input-box mt-2"
          />
          <FieldMessage error={f.shown("number")} hint="Numbers only · 11 digits, starts with 09" />
        </label>
        <button disabled={busy} className="btn-sm solid">{busy ? "Saving…" : "Save GCash details"}</button>
      </div>
    </form>
  )
}

function QrphCard({ settings }) {
  const notify = useNotify()
  const q = settings.qrph || {}
  const [name, setName] = useState(q.name || "")
  const [qr, setQr] = useState(q.qr || "")
  const [busy, setBusy] = useState(false)

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      setQr(await uploadImage(file, "qrph"))
    } catch (e) {
      notify("Upload failed", e.message, { tone: "error" })
    } finally {
      setBusy(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await setSetting("qrph", { name: name.trim(), qr })
      notify("QRPh details saved", "Customers will see them at checkout.", { tone: "success" })
    } catch (err) {
      notify("Could not save", err.message, { tone: "error" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="grid gap-6 rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-sm sm:grid-cols-[200px_1fr] sm:p-8">
      <QrPicker qr={qr} alt="QRPh QR" busy={busy} onFile={upload} />
      <div className="space-y-5">
        <p className="eyebrow">QRPh</p>
        <label className="block">
          <span className="opt-label">Account name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-box mt-2" />
        </label>
        <p className="text-xs leading-5 text-earth-600">
          Upload the QR Ph code from your bank or e-wallet business account. Customers can pay it from any
          bank or e-wallet app.
        </p>
        <button disabled={busy} className="btn-sm solid">{busy ? "Saving…" : "Save QRPh details"}</button>
      </div>
    </form>
  )
}

export default function PaymentSettings({ settings }) {
  return (
    <div>
      <PanelHeader eyebrow="Payments" title="Payment details" />
      <div className="max-w-3xl space-y-5">
        <GcashCard settings={settings} />
        <QrphCard settings={settings} />
        <p className="rounded-2xl border border-earth-300 bg-earth-100 p-5 text-sm leading-6 text-earth-700">
          <strong>Cash</strong> needs no setup. For GCash and QRPh, customers can save your QR or copy your
          GCash number here, then send their payment screenshot and order to your Messenger.
        </p>
      </div>
    </div>
  )
}

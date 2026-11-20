import { useState } from "react"
import { Icon } from "../ui.jsx"
import { resolveEvents } from "../../lib/constants.js"
import { setSetting } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { PanelHeader } from "./Shell.jsx"

function Text({ label, value, onChange, rows, max = 200, hint }) {
  return (
    <label className="block">
      <span className="opt-label">{label}</span>
      {rows ? (
        <textarea rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className="input-box mt-2 resize-y" />
      ) : (
        <input maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className="input-box mt-2" />
      )}
      {hint && <span className="mt-1 block text-xs text-earth-600">{hint}</span>}
    </label>
  )
}

function Money({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="opt-label">{label}</span>
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 7))} className="input-box mt-2" />
    </label>
  )
}

/** One item per line. Keeps its own text so typing a new line feels natural. */
function ListBox({ label, items, onChange, rows = 6, hint = "One item per line." }) {
  const [text, setText] = useState(() => items.join("\n"))
  return (
    <label className="block">
      <span className="opt-label">{label}</span>
      <textarea
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange(e.target.value.split("\n"))
        }}
        className="input-box mt-2 resize-y"
      />
      <span className="mt-1 block text-xs text-earth-600">{hint}</span>
    </label>
  )
}

/** Owner: edit the words, prices and lists of the public Events page (the layout stays the same). */
export default function EventsEditor({ settings }) {
  const notify = useNotify()
  const [e, setE] = useState(() => resolveEvents(settings.events))
  const [saving, setSaving] = useState(false)
  // bumped on reset so the list boxes remount with the default text
  const [version, setVersion] = useState(0)
  const set = (k, v) => setE((x) => ({ ...x, [k]: v }))
  const setPkg = (i, k, v) => setE((x) => ({ ...x, packages: x.packages.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }))
  const addPkg = () => setE((x) => ({ ...x, packages: [...x.packages, { name: "", guests: "", price: "", cash: "", classic: 2, premium: 3 }] }))
  const removePkg = (i) => setE((x) => ({ ...x, packages: x.packages.filter((_, j) => j !== i) }))

  const save = async () => {
    const named = e.packages.filter((p) => String(p.name || "").trim())
    if (!named.length) return notify("Add at least one package", "Every package needs a name.", { tone: "error" })
    if (named.some((p) => !Number(p.guests) || !Number(p.price)))
      return notify("Check the packages", "Each package needs a guest count and a price.", { tone: "error" })
    setSaving(true)
    try {
      const clean = resolveEvents(e)
      await setSetting("events", clean)
      setE(clean)
      notify("Events page saved", "Customers will see the changes now.", { tone: "success" })
    } catch (err) {
      notify("Could not save", err.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }
  const reset = async () => {
    if (!window.confirm("Reset the Events page back to the original text, prices and lists?")) return
    setSaving(true)
    try {
      await setSetting("events", {})
      setE(resolveEvents(null))
      setVersion((v) => v + 1)
      notify("Events page reset", "", { tone: "success" })
    } catch (err) {
      notify("Could not reset", err.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }

  const card = "space-y-4 rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-sm sm:p-6"
  return (
    <div>
      <PanelHeader eyebrow="Website" title="Events page">
        <a href="/packages" target="_blank" rel="noreferrer" className="btn-sm">Preview page</a>
        <button className="btn-sm" onClick={reset} disabled={saving}>Reset</button>
        <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </PanelHeader>
      <p className="mb-5 text-sm text-earth-600">
        Change the words, prices and lists here — the page design stays the same. Package prices also update the booking form and the home page.
      </p>

      <div className="space-y-5" key={version}>
        <section className={card}>
          <p className="eyebrow">Top section</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Small heading" value={e.eyebrow} onChange={(v) => set("eyebrow", v)} max={40} />
            <Text label="Big title" value={e.title} onChange={(v) => set("title", v)} max={60} />
          </div>
          <Text label="Tagline" value={e.tagline} onChange={(v) => set("tagline", v)} max={140} />
        </section>

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">Packages</p>
            <button type="button" className="btn-sm" onClick={addPkg}><Icon name="plus" size={14} /> Add package</button>
          </div>
          <div className="space-y-4">
            {e.packages.map((p, i) => (
              <div key={i} className="space-y-3 rounded-xl bg-earth-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-earth-600">PACKAGE {String(i + 1).padStart(2, "0")}</p>
                  <button
                    type="button"
                    className="btn-sm"
                    disabled={e.packages.length <= 1}
                    onClick={() => window.confirm(`Remove the “${p.name || "new"}” package?`) && removePkg(i)}
                  >
                    <Icon name="trash" size={14} /> Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Text label="Name" value={p.name} onChange={(v) => setPkg(i, "name", v)} max={30} />
                  <Money label="Guests" value={p.guests} onChange={(v) => setPkg(i, "guests", v)} />
                  <Money label="Price (₱)" value={p.price} onChange={(v) => setPkg(i, "price", v)} />
                  <Money label="Cash offer (₱)" value={p.cash} onChange={(v) => setPkg(i, "cash", v)} />
                  <Money label="Classic flavors" value={p.classic} onChange={(v) => setPkg(i, "classic", v)} />
                  <Money label="Premium flavors" value={p.premium} onChange={(v) => setPkg(i, "premium", v)} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-earth-600">Existing bookings keep the package name they were booked with, so rename a package with care.</p>
          <Text label="Service time line (shown in every package)" value={e.service} onChange={(v) => set("service", v)} max={80} />
        </section>

        <section className={card}>
          <p className="eyebrow">Inclusions &amp; flavors</p>
          <Text label="Inclusions title" value={e.inclusionsTitle} onChange={(v) => set("inclusionsTitle", v)} max={60} />
          <ListBox label="Package inclusions" rows={8} items={e.inclusions} onChange={(v) => set("inclusions", v)} />
          <Text label="Flavors title" value={e.flavorsTitle} onChange={(v) => set("flavorsTitle", v)} max={60} />
          <div className="grid gap-4 md:grid-cols-2">
            <ListBox label="Classic flavors" rows={10} items={e.classicFlavors} onChange={(v) => set("classicFlavors", v)} />
            <ListBox label="Premium flavors" rows={10} items={e.premiumFlavors} onChange={(v) => set("premiumFlavors", v)} />
          </div>
        </section>

        <section className={card}>
          <p className="eyebrow">Offers, payments &amp; occasions</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Cash offer title" value={e.cashTitle} onChange={(v) => set("cashTitle", v)} max={60} hint="The cash prices come from each package above." />
            <Text label="Extra flavors title" value={e.extraTitle} onChange={(v) => set("extraTitle", v)} max={60} />
            <Money label="Extra premium flavor (₱ each)" value={e.extraPremium} onChange={(v) => set("extraPremium", v)} />
            <Money label="Extra classic flavor (₱ each)" value={e.extraClassic} onChange={(v) => set("extraClassic", v)} />
            <Text label="Payment methods title" value={e.paymentsTitle} onChange={(v) => set("paymentsTitle", v)} max={60} />
            <Text label="Payment note" value={e.paymentNote} onChange={(v) => set("paymentNote", v)} max={140} />
            <Text label="Occasions title" value={e.occasionsTitle} onChange={(v) => set("occasionsTitle", v)} max={60} />
            <Text label="Booking button text" value={e.bookButton} onChange={(v) => set("bookButton", v)} max={50} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ListBox label="Payment methods" rows={4} items={e.payments} onChange={(v) => set("payments", v)} />
            <ListBox label="Occasions" rows={7} items={e.occasions} onChange={(v) => set("occasions", v)} hint="One per line. These are also the “Type of event” choices on the booking form." />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  )
}

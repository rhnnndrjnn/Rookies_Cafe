import { useState } from "react"
import { BOOKING_POLICIES } from "../../lib/constants.js"
import { setSetting } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { PanelHeader } from "./Shell.jsx"
import { Text, editorCard } from "./EditorFields.jsx"

const toText = (sections) => sections.map((s) => `# ${s.title}\n${s.items.join("\n")}`).join("\n\n")
export const resolveBookingPolicy = (value) => {
  if (Array.isArray(value) && value.length) return value
  if (typeof value !== "string" || !value.trim()) return BOOKING_POLICIES
  const sections = []
  value.split(/\r?\n/).forEach((line) => {
    const t = line.trim()
    if (!t) return
    if (t.startsWith("#")) sections.push({ title: t.replace(/^#+\s*/, ""), items: [] })
    else {
      if (!sections.length) sections.push({ title: "Booking Policies", items: [] })
      sections[sections.length - 1].items.push(t.replace(/^[-•]\s*/, ""))
    }
  })
  return sections.filter((s) => s.title && s.items.length)
}

export default function BookingPolicyEditor({ settings }) {
  const notify = useNotify()
  const [value, setValue] = useState(() => toText(resolveBookingPolicy(settings.booking_policy)))
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const policies = resolveBookingPolicy(value)
    if (!policies.length) return notify("Add at least one policy", "Use # before each section title and put each policy on its own line.", { tone: "error" })
    setSaving(true)
    try {
      await setSetting("booking_policy", value.trim())
      notify("Booking policies saved", "Customers will see the updated policies on the booking page.", { tone: "success" })
    } catch (e) {
      notify("Could not save", e.message, { tone: "error" })
    } finally { setSaving(false) }
  }
  const reset = async () => {
    if (!window.confirm("Reset booking policies to the original default policies?")) return
    setSaving(true)
    try {
      await setSetting("booking_policy", null)
      setValue(toText(BOOKING_POLICIES))
      notify("Booking policies reset", "", { tone: "success" })
    } catch (e) { notify("Could not reset", e.message, { tone: "error" }) }
    finally { setSaving(false) }
  }
  return <div>
    <PanelHeader eyebrow="Bookings" title="Booking policies">
      <button className="btn-sm" onClick={reset} disabled={saving}>Reset</button>
      <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
    </PanelHeader>
    <section className={editorCard}>
      <p className="text-sm text-earth-600">Edit the policies customers must read and accept before submitting an event booking. Use <strong># Section title</strong> for each heading, then put each policy on a separate line.</p>
      <Text label="Booking policy content" rows={22} max={12000} value={value} onChange={setValue} placeholder={'# Reservation & Payment\nA 50% down payment is required...'} />
      <p className="text-xs text-earth-600">Example: start a new section with #, then add the rules below it. Each non-empty line becomes one policy item.</p>
    </section>
  </div>
}

import { useState } from "react"
import { resolveContacts } from "../../lib/constants.js"
import { setSetting } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { PanelHeader } from "./Shell.jsx"
import { Text, editorCard } from "./EditorFields.jsx"

/** Owner: edit the words, contact details and links of the public Contacts page (the layout stays the same). */
export default function ContactsEditor({ settings }) {
  const notify = useNotify()
  const [c, setC] = useState(() => resolveContacts(settings.contacts))
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }))
  const setSocial = (i, k, v) => setC((x) => ({ ...x, socials: x.socials.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }))
  const addSocial = () => setC((x) => ({ ...x, socials: [...x.socials, { label: "", handle: "", url: "" }] }))
  const removeSocial = (i) => setC((x) => ({ ...x, socials: x.socials.filter((_, j) => j !== i) }))

  const save = async () => {
    setSaving(true)
    try {
      // drop half-filled social rows (they need a name and a link)
      const socials = c.socials.filter((s) => s.label.trim() && s.url.trim())
      await setSetting("contacts", { ...c, socials })
      setC((x) => ({ ...x, socials }))
      notify("Contacts page saved", "Customers will see the changes now.", { tone: "success" })
    } catch (e) {
      notify("Could not save", e.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }
  const reset = async () => {
    if (!window.confirm("Reset the Contacts page back to the original text and links?")) return
    setSaving(true)
    try {
      await setSetting("contacts", {})
      setC(resolveContacts(null))
      notify("Contacts page reset", "", { tone: "success" })
    } catch (e) {
      notify("Could not reset", e.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PanelHeader eyebrow="Website" title="Contacts page">
        <a href="/contacts" target="_blank" rel="noreferrer" className="btn-sm">Preview page</a>
        <button className="btn-sm" onClick={reset} disabled={saving}>Reset</button>
        <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </PanelHeader>
      <p className="mb-5 text-sm text-earth-600">
        Change the words and contact details here — the page design stays the same. Leave a text box empty to hide it.
        The map and the social links are also used on the Home page and in the footer.
      </p>

      <div className="space-y-5">
        <section className={editorCard}>
          <p className="eyebrow">Page heading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Small heading" value={c.eyebrow} onChange={(v) => set("eyebrow", v)} max={50} />
            <Text label="Title" value={c.title} onChange={(v) => set("title", v)} max={40} />
          </div>
        </section>

        <section className={editorCard}>
          <p className="eyebrow">Visit us</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Text label="Small heading" value={c.panelEyebrow} onChange={(v) => set("panelEyebrow", v)} max={40} />
            <Text label="Title · line 1" value={c.headline1} onChange={(v) => set("headline1", v)} max={40} />
            <Text label="Title · line 2 (italic)" value={c.headline2} onChange={(v) => set("headline2", v)} max={40} />
          </div>
          <Text label="Paragraph" rows={3} max={300} value={c.intro} onChange={(v) => set("intro", v)} />
        </section>

        <section className={editorCard}>
          <p className="eyebrow">Contact details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Address label" value={c.addressLabel} onChange={(v) => set("addressLabel", v)} max={40} />
            <Text label="Map link text" value={c.mapLinkText} onChange={(v) => set("mapLinkText", v)} max={40} />
          </div>
          <Text label="Address" rows={2} max={200} value={c.address} onChange={(v) => set("address", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Phone" value={c.phone} onChange={(v) => set("phone", v)} max={30} placeholder="e.g. 0917 123 4567" hint="Shown only when filled in." />
            <Text label="Email" value={c.email} onChange={(v) => set("email", v)} max={80} placeholder="e.g. hello@rookiescafe.com" hint="Shown only when filled in." />
          </div>
          <Text label="Opening hours" rows={3} max={200} value={c.hours} onChange={(v) => set("hours", v)} placeholder={"Mon–Fri 10:00 AM – 10:00 PM\nSat–Sun 10:00 AM – 11:00 PM"} hint="Shown only when filled in. Each line stays on its own line." />
        </section>

        <section className={editorCard}>
          <p className="eyebrow">Map</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              label="What the map searches for"
              value={c.mapQuery}
              onChange={(v) => set("mapQuery", v)}
              max={200}
              placeholder="Leave empty to use the address above"
              hint="For an exact pin, paste a full address, a Plus Code, or latitude,longitude."
            />
            <Text label="Directions button text" value={c.directionsText} onChange={(v) => set("directionsText", v)} max={30} />
          </div>
        </section>

        <section className={editorCard}>
          <p className="eyebrow">Social media links</p>
          <Text label="Heading" value={c.socialsTitle} onChange={(v) => set("socialsTitle", v)} max={40} />
          <ul className="space-y-3">
            {c.socials.map((s, i) => (
              <li key={i} className="grid gap-2 rounded-xl bg-earth-100 p-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                <Text label="Name" value={s.label} onChange={(v) => setSocial(i, "label", v)} max={30} placeholder="Facebook" />
                <Text label="Shown as" value={s.handle} onChange={(v) => setSocial(i, "handle", v)} max={40} placeholder="@rookiescafe" />
                <Text label="Link" value={s.url} onChange={(v) => setSocial(i, "url", v)} max={300} placeholder="https://…" />
                <button className="btn-sm" onClick={() => removeSocial(i)} aria-label={`Remove ${s.label || "link"}`}>Remove</button>
              </li>
            ))}
          </ul>
          <button className="btn-sm" onClick={addSocial} disabled={c.socials.length >= 8}>+ Add a link</button>
        </section>

        <section className={editorCard}>
          <p className="eyebrow">Message form</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Small heading" value={c.formEyebrow} onChange={(v) => set("formEyebrow", v)} max={40} />
            <Text label="Title" value={c.formTitle} onChange={(v) => set("formTitle", v)} max={40} />
          </div>
          <Text label="Paragraph" rows={3} max={300} value={c.formIntro} onChange={(v) => set("formIntro", v)} />
          <div className="max-w-sm">
            <Text label="Send button text" value={c.sendButton} onChange={(v) => set("sendButton", v)} max={30} />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  )
}

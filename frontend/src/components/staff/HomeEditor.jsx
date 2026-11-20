import { useState } from "react"
import { resolveHome } from "../../lib/constants.js"
import { setSetting, uploadImage } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { PanelHeader } from "./Shell.jsx"
import { Photo, Text, editorCard } from "./EditorFields.jsx"

const MAX_FAVORITES = 8

/** Owner: edit the words, picture and favorite drinks of the public Home page (the layout stays the same). */
export default function HomeEditor({ settings, products }) {
  const notify = useNotify()
  const [h, setH] = useState(() => resolveHome(settings.home))
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setH((x) => ({ ...x, [k]: v }))

  // Product names to pick from. Keep any saved name that is no longer on the menu so it isn't silently lost.
  const names = [...new Set(products.map((p) => p.name))]
  const optionsFor = (current) => (current && !names.includes(current) ? [current, ...names] : names)
  const setFav = (i, v) => setH((x) => ({ ...x, favorites: x.favorites.map((n, j) => (j === i ? v : n)) }))
  const addFav = () => setH((x) => ({ ...x, favorites: [...x.favorites, names.find((n) => !x.favorites.includes(n)) || names[0] || ""] }))
  const removeFav = (i) => setH((x) => ({ ...x, favorites: x.favorites.filter((_, j) => j !== i) }))

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      set("heroImage", await uploadImage(file, "home"))
    } catch (e) {
      notify("Upload failed", e.message, { tone: "error" })
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await setSetting("home", { ...h, favorites: h.favorites.filter(Boolean) })
      notify("Home page saved", "Customers will see the changes now.", { tone: "success" })
    } catch (e) {
      notify("Could not save", e.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }
  const reset = async () => {
    if (!window.confirm("Reset the Home page back to the original text, picture and favorites?")) return
    setSaving(true)
    try {
      await setSetting("home", {})
      setH(resolveHome(null))
      notify("Home page reset", "", { tone: "success" })
    } catch (e) {
      notify("Could not reset", e.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PanelHeader eyebrow="Website" title="Home page">
        <a href="/" target="_blank" rel="noreferrer" className="btn-sm">Preview page</a>
        <button className="btn-sm" onClick={reset} disabled={saving}>Reset</button>
        <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </PanelHeader>
      <p className="mb-5 text-sm text-earth-600">
        Change the words, picture and favorite drinks here — the page design stays the same. Leave a text box empty to hide it.
        The map at the bottom follows the address on the Contacts page.
      </p>

      <div className="space-y-5">
        <section className={editorCard}>
          <p className="eyebrow">Top section</p>
          <Text label="Small heading" value={h.eyebrow} onChange={(v) => set("eyebrow", v)} max={60} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Text label="Big title · line 1" value={h.headline1} onChange={(v) => set("headline1", v)} max={30} />
            <Text label="Big title · line 2 (italic)" value={h.headline2} onChange={(v) => set("headline2", v)} max={30} />
            <Text label="Big title · line 3" value={h.headline3} onChange={(v) => set("headline3", v)} max={30} />
          </div>
          <Text label="Paragraph" rows={3} max={300} value={h.intro} onChange={(v) => set("intro", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Main button text" value={h.primaryButton} onChange={(v) => set("primaryButton", v)} max={30} hint="Opens the menu." />
            <Text label="Second button text" value={h.secondaryButton} onChange={(v) => set("secondaryButton", v)} max={30} hint="Opens the About page." />
            <Text label="Bottom line · left" value={h.stripLeft} onChange={(v) => set("stripLeft", v)} max={40} />
            <Text label="Bottom line · right" value={h.stripRight} onChange={(v) => set("stripRight", v)} max={50} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Photo label="Main picture" src={h.heroImage} alt={h.heroAlt} onSrc={(v) => set("heroImage", v)} onAlt={(v) => set("heroAlt", v)} busy={busy} onUpload={upload} />
            </div>
            <div className="space-y-4">
              <Text label="Label on the picture" value={h.heroBadge} onChange={(v) => set("heroBadge", v)} max={30} placeholder="e.g. New flavor" />
              <label className="block">
                <span className="opt-label">Drink shown on the picture</span>
                <select value={h.heroProduct} onChange={(e) => set("heroProduct", e.target.value)} className="input-box mt-2">
                  {optionsFor(h.heroProduct).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-earth-600">Customers can tap “+” to order it.</span>
              </label>
            </div>
          </div>
        </section>

        <section className={editorCard}>
          <p className="eyebrow">Favorites section</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Small heading" value={h.favEyebrow} onChange={(v) => set("favEyebrow", v)} max={40} />
            <Text label="Title" value={h.favTitle} onChange={(v) => set("favTitle", v)} max={40} />
            <Text label="Button text" value={h.favButton} onChange={(v) => set("favButton", v)} max={30} />
          </div>
          <div>
            <p className="opt-label">Drinks &amp; snacks shown</p>
            <ul className="mt-2 space-y-2">
              {h.favorites.map((n, i) => (
                <li key={i} className="flex items-center gap-2">
                  <select value={n} onChange={(e) => setFav(i, e.target.value)} className="input-box" aria-label={`Favorite ${i + 1}`}>
                    {optionsFor(n).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <button className="btn-sm" onClick={() => removeFav(i)} disabled={h.favorites.length <= 1} aria-label={`Remove favorite ${i + 1}`}>Remove</button>
                </li>
              ))}
            </ul>
            <button className="btn-sm mt-3" onClick={addFav} disabled={h.favorites.length >= MAX_FAVORITES || names.length === 0}>+ Add a favorite</button>
            <p className="mt-2 text-xs text-earth-600">Items that are switched off on the menu are skipped automatically.</p>
          </div>
        </section>

        <section className={editorCard}>
          <p className="eyebrow">Coffee cart section</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Small heading" value={h.eventEyebrow} onChange={(v) => set("eventEyebrow", v)} max={40} />
            <span className="hidden sm:block" />
            <Text label="Title · line 1" value={h.eventTitle1} onChange={(v) => set("eventTitle1", v)} max={40} />
            <Text label="Title · line 2 (italic)" value={h.eventTitle2} onChange={(v) => set("eventTitle2", v)} max={40} />
          </div>
          <Text label="Paragraph" rows={4} max={400} value={h.eventText} onChange={(v) => set("eventText", v)} />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={h.showPackagePrice} onChange={(e) => set("showPackagePrice", e.target.checked)} className="mt-1" />
            <span>
              Add “Packages start at ₱… for … guests.” after the paragraph
              <span className="block text-xs text-earth-600">Uses the first package on the Events page, so it stays up to date.</span>
            </span>
          </label>
          <Text label="Link text" value={h.eventLink} onChange={(v) => set("eventLink", v)} max={40} />
        </section>

        <div className="flex justify-end">
          <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  )
}

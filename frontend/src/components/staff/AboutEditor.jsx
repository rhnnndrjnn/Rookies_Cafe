import { useState } from "react"
import { Icon } from "../ui.jsx"
import { resolveAbout } from "../../lib/constants.js"
import { setSetting, uploadImage } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { PanelHeader } from "./Shell.jsx"

function Text({ label, value, onChange, rows, max = 200 }) {
  return (
    <label className="block">
      <span className="opt-label">{label}</span>
      {rows ? (
        <textarea rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className="input-box mt-2 resize-y" />
      ) : (
        <input maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className="input-box mt-2" />
      )}
    </label>
  )
}

function Photo({ label, src, alt, onSrc, onAlt, busy, onUpload }) {
  return (
    <div className="rounded-2xl border border-earth-300 bg-earth-50 p-3">
      <p className="opt-label mb-2">{label}</p>
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-earth-200">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-earth-600">No picture</span>}
      </div>
      <label className={`btn-sm mt-3 w-full cursor-pointer ${busy ? "opacity-60" : ""}`}>
        <Icon name="upload" size={14} /> {busy ? "Uploading…" : src ? "Replace picture" : "Upload picture"}
        <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => onUpload(e.target.files?.[0])} />
      </label>
      <input
        value={src.startsWith("data:") ? "(uploaded picture)" : src}
        readOnly={src.startsWith("data:")}
        onChange={(e) => onSrc(e.target.value)}
        placeholder="…or paste an image URL"
        aria-label={`${label} image URL`}
        className="input-box mt-2 !text-xs"
      />
      <input value={alt} onChange={(e) => onAlt(e.target.value)} maxLength={120} placeholder="Short description of the picture" aria-label={`${label} description`} className="input-box mt-2 !text-xs" />
    </div>
  )
}

/** Owner: edit the words and pictures of the public About page (the layout stays the same). */
export default function AboutEditor({ settings }) {
  const notify = useNotify()
  const [a, setA] = useState(() => resolveAbout(settings.about))
  const [busy, setBusy] = useState("")
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setA((x) => ({ ...x, [k]: v }))
  const setValue = (i, k, v) => setA((x) => ({ ...x, values: x.values.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }))
  const setGallery = (i, k, v) => setA((x) => ({ ...x, gallery: x.gallery.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }))

  const upload = async (key, file, apply) => {
    if (!file) return
    setBusy(key)
    try {
      apply(await uploadImage(file, "about"))
    } catch (e) {
      notify("Upload failed", e.message, { tone: "error" })
    } finally {
      setBusy("")
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await setSetting("about", a)
      notify("About page saved", "Customers will see the changes now.", { tone: "success" })
    } catch (e) {
      notify("Could not save", e.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }
  const reset = async () => {
    if (!window.confirm("Reset the About page back to the original text and pictures?")) return
    setSaving(true)
    try {
      await setSetting("about", {})
      setA(resolveAbout(null))
      notify("About page reset", "", { tone: "success" })
    } catch (e) {
      notify("Could not reset", e.message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }

  const card = "space-y-4 rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-sm sm:p-6"
  return (
    <div>
      <PanelHeader eyebrow="Website" title="About page">
        <a href="/about" target="_blank" rel="noreferrer" className="btn-sm">Preview page</a>
        <button className="btn-sm" onClick={reset} disabled={saving}>Reset</button>
        <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </PanelHeader>
      <p className="mb-5 text-sm text-earth-600">Change the words and pictures here — the page design stays the same.</p>

      <div className="space-y-5">
        <section className={card}>
          <p className="eyebrow">Top section</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Small heading" value={a.eyebrow} onChange={(v) => set("eyebrow", v)} max={40} />
            <span className="hidden sm:block" />
            <Text label="Big title · line 1" value={a.headline1} onChange={(v) => set("headline1", v)} max={40} />
            <Text label="Big title · line 2 (italic)" value={a.headline2} onChange={(v) => set("headline2", v)} max={40} />
          </div>
          <Text label="Paragraph" rows={5} max={700} value={a.intro} onChange={(v) => set("intro", v)} />
          <Text label="Closing line" value={a.closing} onChange={(v) => set("closing", v)} max={120} />
          <div className="max-w-sm">
            <Photo label="Main picture" src={a.heroImage} alt={a.heroAlt} onSrc={(v) => set("heroImage", v)} onAlt={(v) => set("heroAlt", v)} busy={busy === "hero"} onUpload={(f) => upload("hero", f, (u) => set("heroImage", u))} />
          </div>
        </section>

        <section className={card}>
          <p className="eyebrow">“Why we brew” section</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Text label="Small heading" value={a.whyEyebrow} onChange={(v) => set("whyEyebrow", v)} max={40} />
            <Text label="Title · line 1" value={a.whyTitle1} onChange={(v) => set("whyTitle1", v)} max={40} />
            <Text label="Title · line 2" value={a.whyTitle2} onChange={(v) => set("whyTitle2", v)} max={40} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {a.values.map((v, i) => (
              <div key={i} className="space-y-3 rounded-xl bg-earth-100 p-4">
                <p className="text-[10px] font-bold text-earth-600">CARD {String(i + 1).padStart(2, "0")}</p>
                <Text label="Title" value={v.title} onChange={(t) => setValue(i, "title", t)} max={50} />
                <Text label="Text" rows={3} max={300} value={v.text} onChange={(t) => setValue(i, "text", t)} />
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <p className="eyebrow">Picture gallery</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Small heading" value={a.galleryEyebrow} onChange={(v) => set("galleryEyebrow", v)} max={40} />
            <Text label="Title" value={a.galleryTitle} onChange={(v) => set("galleryTitle", v)} max={60} />
            <Text label="Button text" value={a.menuButton} onChange={(v) => set("menuButton", v)} max={30} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.gallery.map((g, i) => (
              <Photo key={i} label={`Picture ${i + 1}${i === 0 ? " (tall)" : i === 3 ? " (wide)" : ""}`} src={g.src} alt={g.alt} onSrc={(v) => setGallery(i, "src", v)} onAlt={(v) => setGallery(i, "alt", v)} busy={busy === `g${i}`} onUpload={(f) => upload(`g${i}`, f, (u) => setGallery(i, "src", u))} />
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-sm solid" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  )
}

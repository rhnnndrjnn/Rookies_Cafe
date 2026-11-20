import { Icon } from "../ui.jsx"

/** Shared form pieces for the owner's page editors (Home, Contacts). */
export const editorCard = "space-y-4 rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-sm sm:p-6"

export function Text({ label, value, onChange, rows, max = 200, hint, placeholder }) {
  return (
    <label className="block">
      <span className="opt-label">{label}</span>
      {rows ? (
        <textarea rows={rows} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="input-box mt-2 resize-y" />
      ) : (
        <input maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="input-box mt-2" />
      )}
      {hint && <span className="mt-1 block text-xs text-earth-600">{hint}</span>}
    </label>
  )
}

export function Photo({ label, src, alt, onSrc, onAlt, busy, onUpload }) {
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

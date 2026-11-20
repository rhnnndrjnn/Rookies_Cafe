import { useState } from "react"
import { FieldMessage, Icon, Input, Modal } from "../ui.jsx"
import { CATEGORIES, FRIES_SHARING_DEFAULT, SIZE_UPCHARGE, isDrinkCategory, isFries, peso } from "../../lib/constants.js"
import { deleteProduct, saveProduct, uploadImage } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { rules, useLiveForm } from "../../lib/validate.js"
import { PanelHeader, Switch } from "./Shell.jsx"

const blank = { name: "", detail: "", price: "", price_22: "", category: CATEGORIES[0], image: "", available: true, has_hot: false }

const RULES = {
  name: rules.required("Product name"),
  price: rules.price,
  price_22: rules.priceOptional,
}

function ProductForm({ product, onClose }) {
  const notify = useNotify()
  const [f, setF] = useState(() => ({
    ...blank,
    ...product,
    price: product?.price != null ? String(product.price) : "",
    price_22: product?.price_22 != null ? String(product.price_22) : "",
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const form = useLiveForm(f, RULES)
  const isDrink = isDrinkCategory(f.category)
  const fries = isFries(f) // Flavored Fries: price = Solo, price_22 = Sharing

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      set("image", await uploadImage(file, "products"))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    form.touchAll()
    if (!form.valid) return setError("Please fix the highlighted fields first.")
    const price = Number(f.price)
    const payload = {
      ...(product?.id ? { id: product.id } : {}),
      name: f.name.trim(),
      detail: f.detail.trim(),
      category: f.category,
      price,
      price_22: isDrink
        ? Number(f.price_22) || price + SIZE_UPCHARGE
        : fries
          ? Number(f.price_22) || FRIES_SHARING_DEFAULT
          : null,
      image: f.image.trim(),
      available: f.available,
      has_hot: isDrink ? !!f.has_hot : false,
    }
    setBusy(true)
    try {
      await saveProduct(payload)
      notify(product?.id ? "Product updated" : "Product added", payload.name, { tone: "success" })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <h3 className="display-title text-2xl">{product?.id ? "Edit product" : "Add product"}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-earth-100">
          <Icon name="close" size={16} />
        </button>
      </div>
      <label className="block">
        <span className="opt-label">Name</span>
        <Input
          value={f.name}
          onValue={(v) => set("name", v)}
          onBlur={() => form.blur("name")}
          error={form.shown("name")}
          maxLength={80}
          className="input-box mt-2"
        />
        <FieldMessage error={form.shown("name")} />
      </label>
      <label className="block">
        <span className="opt-label">Description</span>
        <textarea rows={2} value={f.detail} onChange={(e) => set("detail", e.target.value)} className="input-box mt-2 resize-y" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <label className="block">
          <span className="opt-label">Category</span>
          <select value={f.category} onChange={(e) => set("category", e.target.value)} className="input-box mt-2">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="opt-label">{isDrink ? "Price · 16oz (₱)" : fries ? "Price · Solo (₱)" : "Price (₱)"}</span>
          <Input
            kind="decimal"
            value={f.price}
            onValue={(v) => set("price", v)}
            onBlur={() => form.blur("price")}
            error={form.shown("price")}
            placeholder="0.00"
            maxLength={9}
            className="input-box mt-2"
          />
          <FieldMessage error={form.shown("price")} hint="Numbers only" />
        </label>
        {(isDrink || fries) && (
          <label className="block">
            <span className="opt-label">{fries ? "Price · Sharing (₱)" : "Price · 22oz (₱)"}</span>
            <Input
              kind="decimal"
              value={f.price_22}
              onValue={(v) => set("price_22", v)}
              onBlur={() => form.blur("price_22")}
              error={form.shown("price_22")}
              placeholder={fries ? `${FRIES_SHARING_DEFAULT} if blank` : `+${SIZE_UPCHARGE} if blank`}
              maxLength={9}
              className="input-box mt-2"
            />
            <FieldMessage error={form.shown("price_22")} hint="Numbers only" />
          </label>
        )}
      </div>
      <div>
        <span className="opt-label">Image</span>
        <div className="mt-2 flex items-center gap-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-earth-200">
            {f.image && <img src={f.image} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <input
              value={f.image.startsWith("data:") ? "(uploaded image)" : f.image}
              onChange={(e) => set("image", e.target.value)}
              readOnly={f.image.startsWith("data:")}
              placeholder="Paste an image URL…"
              className="input-box"
            />
            <label className="btn-sm cursor-pointer">
              <Icon name="upload" size={14} /> Upload image
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <label className="flex items-center gap-3 text-sm font-semibold">
          <Switch on={f.available} onChange={(v) => set("available", v)} label="Available" /> Available
        </label>
        {isDrink && (
          <label className="flex items-center gap-3 text-sm font-semibold">
            <Switch on={!!f.has_hot} onChange={(v) => set("has_hot", v)} label="Can be served hot" /> Can be served hot (8oz)
          </label>
        )}
      </div>
      {error && <p role="alert" className="rounded-xl bg-[#F3DEDB] p-3 text-xs text-[#8F3B31]">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-earth-200 pt-5">
        <button type="button" className="btn-sm" onClick={onClose}>Cancel</button>
        <button disabled={busy} className="btn-sm solid">{busy ? "Saving…" : "Save product"}</button>
      </div>
    </form>
  )
}

export default function ProductsManager({ products }) {
  const notify = useNotify()
  const [editing, setEditing] = useState(null) // product | {} (new) | null
  const [filter, setFilter] = useState("All")
  const list = products.filter((p) => filter === "All" || p.category === filter)

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.name}”? Past orders keep their record.`)) return
    try {
      await deleteProduct(p.id)
      notify("Product deleted", p.name)
    } catch (e) {
      notify("Could not delete", e.message, { tone: "error" })
    }
  }

  return (
    <div>
      <PanelHeader eyebrow="Menu" title="Products">
        <button className="btn-sm solid" onClick={() => setEditing({})}>
          <Icon name="plus" size={14} /> Add product
        </button>
      </PanelHeader>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {["All", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`chip whitespace-nowrap ${filter === c ? "chip-active" : ""}`}>{c}</button>
        ))}
      </div>
      <ul className="overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-sm">
        {list.length === 0 && <li className="px-5 py-14 text-center text-sm text-earth-600">No products in this category.</li>}
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-2 border-b border-earth-200 p-2.5 last:border-b-0 sm:gap-3 sm:p-3">
            <img src={p.image} alt="" className="size-14 shrink-0 rounded-lg bg-earth-200 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate text-xs text-earth-600">
                {p.category} · {peso(p.price)}{p.price_22 ? ` / ${peso(p.price_22)}` : ""}
                {!p.available && <span className="ml-2 font-bold text-[#8F3B31]">SOLD OUT</span>}
              </p>
            </div>
            <button className="btn-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
              <Icon name="edit" size={14} /> <span className="hidden sm:inline">Edit</span>
            </button>
            <button className="btn-sm danger" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}>
              <Icon name="trash" size={14} />
            </button>
          </li>
        ))}
      </ul>
      <Modal open={!!editing} onClose={() => setEditing(null)} wide label="Product editor">
        {editing && <ProductForm key={editing.id || "new"} product={editing.id ? editing : null} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}

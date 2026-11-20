import { useState } from "react"
import { FieldMessage, Icon, Input, Modal } from "../ui.jsx"
import { DEFAULT_CATEGORY_LIST, FRIES_SHARING_DEFAULT, SIZE_UPCHARGE, isDrinkCategory, isFries, peso, resolveCategories } from "../../lib/constants.js"
import { deleteProduct, saveProduct, setSetting, uploadImage } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { rules, useLiveForm } from "../../lib/validate.js"
import { PanelHeader, Switch } from "./Shell.jsx"

const blank = { name: "", detail: "", price: "", price_22: "", category: DEFAULT_CATEGORY_LIST[0].name, image: "", available: true, has_hot: false }

const RULES = {
  name: rules.required("Product name"),
  price: rules.price,
  price_22: rules.priceOptional,
}

function ProductForm({ product, categories, onClose }) {
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
  const isDrink = isDrinkCategory(f.category, categories)
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
            {categories.map((c) => <option key={c.name}>{c.name}</option>)}
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


/** Owner: add / remove menu categories. */
function CategoryManager({ categories, products, onClose }) {
  const notify = useNotify()
  const [name, setName] = useState("")
  const [kind, setKind] = useState("drink")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const save = async (list) => {
    setBusy(true)
    try {
      await setSetting("categories", { list })
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const add = async (e) => {
    e.preventDefault()
    setError("")
    const n = name.trim().replace(/\s+/g, " ")
    if (n.length < 2) return setError("Category name must be at least 2 characters.")
    if (categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) return setError("That category already exists.")
    if (await save([...categories, { name: n, kind }])) {
      notify("Category added", n, { tone: "success" })
      setName("")
    }
  }

  const remove = async (c) => {
    const used = products.filter((p) => p.category === c.name).length
    if (used) return setError(`“${c.name}” still has ${used} product${used === 1 ? "" : "s"}. Move or delete them first.`)
    if (categories.length <= 1) return setError("You need at least one category.")
    if (!window.confirm(`Delete the “${c.name}” category?`)) return
    setError("")
    if (await save(categories.filter((x) => x.name !== c.name))) notify("Category deleted", c.name)
  }

  const move = async (i, d) => {
    const list = [...categories]
    const j = i + d
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    await save(list)
  }

  return (
    <div className="space-y-5 p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <h3 className="display-title text-2xl">Menu categories</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-earth-100">
          <Icon name="close" size={16} />
        </button>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-earth-300">
        {categories.map((c, i) => (
          <li key={c.name} className="flex items-center gap-2 border-b border-earth-200 px-3 py-2.5 text-sm last:border-b-0">
            <span className="min-w-0 flex-1">
              <strong>{c.name}</strong>
              <span className="block text-[11px] text-earth-600">
                {c.kind === "drink" ? "Drink (size, sugar, add-ons)" : "Snack"} · {products.filter((p) => p.category === c.name).length} items
              </span>
            </span>
            <button className="btn-sm" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c.name} up`}>↑</button>
            <button className="btn-sm" disabled={busy || i === categories.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c.name} down`}>↓</button>
            <button className="btn-sm danger" disabled={busy} onClick={() => remove(c)} aria-label={`Delete ${c.name}`}>
              <Icon name="trash" size={14} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-3 rounded-2xl bg-earth-100 p-4">
        <p className="opt-label">Add a new category</p>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="e.g. Pastries, Frappe, Iced Tea" className="input-box" aria-label="New category name" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`chip ${kind === "drink" ? "chip-active" : ""}`} onClick={() => setKind("drink")}>Drink</button>
          <button type="button" className={`chip ${kind === "snack" ? "chip-active" : ""}`} onClick={() => setKind("snack")}>Snack / food</button>
          <button disabled={busy} className="btn-sm solid ml-auto">{busy ? "Saving…" : "Add category"}</button>
        </div>
        <p className="text-[11px] leading-4 text-earth-600">Drinks get size, sugar level and add-ons. Snack / food items are a single price.</p>
      </form>
      {error && <p role="alert" className="rounded-xl bg-[#F3DEDB] p-3 text-xs text-[#8F3B31]">{error}</p>}
    </div>
  )
}

export default function ProductsManager({ products, settings }) {
  const notify = useNotify()
  const [editing, setEditing] = useState(null) // product | {} (new) | null
  const [filter, setFilter] = useState("All")
  const [managing, setManaging] = useState(false)
  const categories = resolveCategories(settings, products)
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
        <button className="btn-sm" onClick={() => setManaging(true)}>
          <Icon name="edit" size={14} /> Categories
        </button>
        <button className="btn-sm solid" onClick={() => setEditing({})}>
          <Icon name="plus" size={14} /> Add product
        </button>
      </PanelHeader>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {["All", ...categories.map((c) => c.name)].map((c) => (
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
        {editing && <ProductForm key={editing.id || "new"} product={editing.id ? editing : null} categories={categories} onClose={() => setEditing(null)} />}
      </Modal>
      <Modal open={managing} onClose={() => setManaging(false)} label="Manage categories">
        {managing && <CategoryManager categories={categories} products={products} onClose={() => setManaging(false)} />}
      </Modal>
    </div>
  )
}

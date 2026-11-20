import { useEffect, useState } from "react"
import { FieldMessage, Icon, Input, Modal } from "../ui.jsx"
import { DEFAULT_CATEGORY_LIST, DEFAULT_MENU_ADDONS, FRIES_SHARING_DEFAULT, SIZE_UPCHARGE, isDrinkCategory, isFries, peso, resolveCategories } from "../../lib/constants.js"
import { deleteProduct, reorderProducts, saveProduct, setSetting, uploadImage } from "../../lib/db.js"
import { useNotify } from "../../lib/notify.jsx"
import { rules, useLiveForm } from "../../lib/validate.js"
import { PanelHeader, Switch } from "./Shell.jsx"

const PRODUCT_BADGES = ["New", "Best Seller", "Must Try", "For Sharing"]
const blank = { name: "", detail: "", price: "", price_22: "", category: DEFAULT_CATEGORY_LIST[0].name, image: "", available: true, has_hot: false, badge: null }

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
      badge: f.badge || null,
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
      <label className="block">
        <span className="opt-label">Product label (optional)</span>
        <select value={f.badge || ""} onChange={(e) => set("badge", e.target.value || null)} className="input-box mt-2">
          <option value="">No label</option>
          {PRODUCT_BADGES.map((badge) => <option key={badge} value={badge}>{badge}</option>)}
        </select>
        <span className="mt-1 block text-[11px] text-earth-600">Shown as a small label on the customer menu.</span>
      </label>
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

function SharedAddonsManager({ settings }) {
  const notify = useNotify()
  const [group, setGroup] = useState("drinks")
  const [items, setItems] = useState(() => ({
    drinks: (settings?.menu_addons?.drinks || DEFAULT_MENU_ADDONS.drinks).map((a) => ({ ...a })),
    snacks: (settings?.menu_addons?.snacks || DEFAULT_MENU_ADDONS.snacks).map((a) => ({ ...a })),
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const current = items[group] || []

  useEffect(() => {
    setItems({
      drinks: (settings?.menu_addons?.drinks || DEFAULT_MENU_ADDONS.drinks).map((a) => ({ ...a })),
      snacks: (settings?.menu_addons?.snacks || DEFAULT_MENU_ADDONS.snacks).map((a) => ({ ...a })),
    })
  }, [settings?.menu_addons])

  const update = (next) => setItems((old) => ({ ...old, [group]: next }))
  const save = async () => {
    setError("")
    for (const key of ["drinks", "snacks"]) {
      const names = items[key].map((a) => a.name.trim().toLowerCase()).filter(Boolean)
      if (new Set(names).size !== names.length) return setError(`Add-on names in ${key} must be unique.`)
      if (items[key].some((a) => !a.name.trim() || !Number.isFinite(Number(a.price)) || Number(a.price) < 0))
        return setError(`Check the names and prices in ${key}.`)
    }
    setBusy(true)
    try {
      const clean = Object.fromEntries(["drinks", "snacks"].map((key) => [key, items[key].map((a) => ({ name: a.name.trim(), price: Number(a.price), available: a.available !== false }))]))
      await setSetting("menu_addons", clean)
      notify("Add-ons saved", "Customers will see the updated available options.", { tone: "success" })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-earth-600">Manage shared add-ons once here. Changes apply to every matching product and customer browser.</p>
        <div className="mt-4 flex rounded-full border border-earth-300 bg-earth-100 p-1" role="tablist" aria-label="Add-on groups">
          {[{ id: "drinks", label: "Drinks" }, { id: "snacks", label: "Snacks" }].map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={group === tab.id} onClick={() => setGroup(tab.id)} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${group === tab.id ? "bg-earth-700 text-earth-50" : "text-earth-700 hover:bg-earth-200"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {current.map((addon, index) => (
          <div key={`${group}-${index}`} className={`rounded-2xl border p-3 ${addon.available === false ? "border-earth-200 bg-earth-100 opacity-70" : "border-earth-300 bg-earth-50"}`}>
            <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
              <label className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-earth-600">Add-on name</span>
                <input value={addon.name} onChange={(e) => update(current.map((a, i) => i === index ? { ...a, name: e.target.value } : a))} maxLength={40} placeholder="e.g. Extra cheese" className="input-box mt-1" />
              </label>
              <label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-earth-600">Extra ₱</span>
                <input type="number" min="0" step="0.01" value={addon.price} onChange={(e) => update(current.map((a, i) => i === index ? { ...a, price: e.target.value } : a))} className="input-box mt-1" />
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <Switch on={addon.available !== false} onChange={(v) => update(current.map((a, i) => i === index ? { ...a, available: v } : a))} label={`Make ${addon.name || "add-on"} available`} />
                {addon.available === false ? "Unavailable" : "Available to customers"}
              </label>
              <button type="button" className="btn-sm danger" onClick={() => update(current.filter((_, i) => i !== index))} aria-label={`Delete ${addon.name}`}><Icon name="trash" size={14} /> Delete</button>
            </div>
          </div>
        ))}
        {current.length === 0 && <p className="rounded-xl bg-earth-100 p-4 text-sm text-earth-600">No {group} add-ons yet. Add one below.</p>}
      </div>
      <button type="button" className="btn-sm" onClick={() => update([...current, { name: "", price: 0, available: true }])}><Icon name="plus" size={14} /> Add {group === "drinks" ? "drink" : "snack"} add-on</button>
      {error && <p role="alert" className="rounded-xl bg-[#F3DEDB] p-3 text-xs text-[#8F3B31]">{error}</p>}
      <div className="flex justify-end border-t border-earth-200 pt-4">
        <button type="button" disabled={busy} onClick={save} className="btn-sm solid">{busy ? "Saving…" : "Save add-ons"}</button>
      </div>
    </div>
  )
}

export default function ProductsManager({ products, settings }) {
  const notify = useNotify()
  const [editing, setEditing] = useState(null) // product | {} (new) | null
  const [filter, setFilter] = useState("All")
  const [section, setSection] = useState("products")
  const [managing, setManaging] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderedProducts, setOrderedProducts] = useState(products)
  const categories = resolveCategories(settings, products)
  useEffect(() => setOrderedProducts(products), [products])
  const list = orderedProducts.filter((p) => filter === "All" || p.category === filter)

  const dropProduct = async (targetId) => {
    if (!draggedId || draggedId === targetId || filter !== "All") return
    const reordered = [...orderedProducts]
    const from = reordered.findIndex((p) => p.id === draggedId)
    const to = reordered.findIndex((p) => p.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setOrderedProducts(reordered)
    setDraggedId(null)
    setSavingOrder(true)
    try {
      await reorderProducts(reordered.map((p) => p.id))
      notify("Product order saved", "Customers will see this order too.", { tone: "success" })
    } catch (e) {
      setOrderedProducts(products)
      notify("Could not save product order", e.message, { tone: "error" })
    } finally {
      setSavingOrder(false)
    }
  }

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
      <PanelHeader eyebrow="Menu" title={section === "products" ? "Products" : "Add-ons"}>
        {section === "products" && <>
          <button className="btn-sm" onClick={() => setManaging(true)}><Icon name="edit" size={14} /> Categories</button>
          <button className="btn-sm solid" onClick={() => setEditing({})}><Icon name="plus" size={14} /> Add product</button>
        </>}
      </PanelHeader>
      <div className="mb-5 flex gap-2 border-b border-earth-300" role="tablist" aria-label="Product management sections">
        <button type="button" role="tab" aria-selected={section === "products"} onClick={() => setSection("products")} className={`border-b-2 px-4 py-3 text-sm font-bold ${section === "products" ? "border-earth-700 text-earth-900" : "border-transparent text-earth-500"}`}>Products</button>
        <button type="button" role="tab" aria-selected={section === "addons"} onClick={() => setSection("addons")} className={`border-b-2 px-4 py-3 text-sm font-bold ${section === "addons" ? "border-earth-700 text-earth-900" : "border-transparent text-earth-500"}`}>Add-ons</button>
      </div>
      {section === "addons" ? <SharedAddonsManager settings={settings} /> : <>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {["All", ...categories.map((c) => c.name)].map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`chip whitespace-nowrap ${filter === c ? "chip-active" : ""}`}>{c}</button>
        ))}
      </div>
      <p className="mb-3 text-xs text-earth-600">
        {savingOrder ? "Saving menu order…" : filter === "All" ? "Drag products using the handle to change their order. New products appear at the top automatically." : "Switch to All to rearrange the full menu."}
      </p>
      <ul className="overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-sm">
        {list.length === 0 && <li className="px-5 py-14 text-center text-sm text-earth-600">No products in this category.</li>}
        {list.map((p) => (
          <li
            key={p.id}
            draggable={filter === "All" && !savingOrder}
            onDragStart={() => setDraggedId(p.id)}
            onDragOver={(e) => { if (filter === "All") e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); dropProduct(p.id) }}
            onDragEnd={() => setDraggedId(null)}
            className={`flex items-center gap-2 border-b border-earth-200 p-2.5 last:border-b-0 sm:gap-3 sm:p-3 ${draggedId === p.id ? "opacity-40" : ""}`}
          >
            <button type="button" className={`grid size-8 shrink-0 place-items-center rounded-lg text-earth-600 ${filter === "All" ? "cursor-grab active:cursor-grabbing hover:bg-earth-200" : "opacity-30"}`} title="Drag to reorder" aria-label={`Drag ${p.name} to reorder`} disabled={filter !== "All" || savingOrder}>
              <span className="text-xl leading-none">⠿</span>
            </button>
            <img src={p.image} alt="" className="size-14 shrink-0 rounded-lg bg-earth-200 object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                {p.badge && <span className="shrink-0 rounded-full bg-earth-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-earth-700">{p.badge}</span>}
              </div>
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
      </>}
    </div>
  )
}

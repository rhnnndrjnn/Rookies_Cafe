import { useMemo, useState } from "react"
import { Chip, Icon, Modal } from "./ui.jsx"
import ProductSticker from "./ProductSticker.jsx"
import {
  FRIES_FLAVORS,
  FRIES_SERVINGS,
  HOT_SIZE,
  SIZES,
  DEFAULT_SUGAR,
  SUGAR_LEVELS,
  addonPrice,
  addonsFor,
  friesPrice,
  isDrinkCategory,
  isFries,
  peso,
  unitPrice,
} from "../lib/constants.js"

// Opens when the "+" button is pressed. Also used to edit a line already in the cart.
export default function ProductModal({ product, line, categories, onClose, onSubmit }) {
  // Every category except Snacks is a drink and gets sugar level / size / add-ons.
  const isDrink = isDrinkCategory(product?.category, categories)
  const hotAllowed = isDrink && !!product?.has_hot
  // Flavored Fries: the customer must pick a serving (Solo / Sharing) and a flavor.
  const fries = isFries(product)

  const [sugar, setSugar] = useState(line?.sugar ?? DEFAULT_SUGAR)
  const [temp, setTemp] = useState(line?.temp === "Hot" && hotAllowed ? "Hot" : "Iced")
  const [size, setSize] = useState(SIZES.includes(line?.size) ? line.size : SIZES[0])
  const [addons, setAddons] = useState(line?.addons || [])
  const [qty, setQty] = useState(line?.qty || 1)
  const [serving, setServing] = useState(FRIES_SERVINGS.includes(line?.serving) ? line.serving : "")
  const [flavor, setFlavor] = useState(FRIES_FLAVORS.includes(line?.flavor) ? line.flavor : "")
  const [tried, setTried] = useState(false) // show what is missing after a tap on "Add to cart"
  const needsPick = fries && (!serving || !flavor)

  const isHot = isDrink && temp === "Hot"
  const effectiveSize = !isDrink ? undefined : isHot ? HOT_SIZE : size

  // Hot drinks are a single 8oz size and priced at the base (16oz) price.
  // Drinks have their own add-ons; Nachos & Cheesy Fries can add Beef / Cheese / Veggies (₱30 each).
  const addonOptions = addonsFor(product, categories)
  const activeAddons = addons.filter((a) => addonOptions.includes(a))

  const price = useMemo(
    () =>
      fries
        ? friesPrice(product, serving || "Solo")
        : unitPrice(product, effectiveSize === "22oz" ? "22oz" : "16oz", activeAddons),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, effectiveSize, addons, fries, serving],
  )

  const toggleAddon = (a) =>
    setAddons((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))

  const submit = () => {
    if (needsPick) return setTried(true)
    onSubmit({
      productId: product.id,
      name: product.name,
      image: product.image,
      category: product.category,
      sugar: isDrink ? sugar : undefined,
      temp: isDrink ? temp : undefined,
      size: effectiveSize,
      serving: fries ? serving : undefined,
      flavor: fries ? flavor : undefined,
      addons: activeAddons,
      qty,
      unitPrice: price,
    })
  }

  return (
    <Modal open={!!product} onClose={onClose} label={`Customize ${product?.name}`}>
      {product && (
        <div>
          <div className="relative h-44 overflow-hidden rounded-t-3xl bg-earth-200">
            <ProductSticker label={product.badge} />
            {product.image && (
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-earth-950/70 to-transparent" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-earth-50/90"
            >
              <Icon name="close" size={16} />
            </button>
            <div className="absolute bottom-4 left-5 right-5 text-earth-50">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-earth-200">
                {product.category}
              </p>
              <h2 className="display-title text-3xl leading-tight">{product.name}</h2>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            {product.detail && <p className="text-sm leading-6 text-earth-600">{product.detail}</p>}

            {fries && (
              <>
                <section>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <p className="opt-label">Serving</p>
                    {tried && !serving && <p className="text-[11px] font-semibold text-red-700">Pick one</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FRIES_SERVINGS.map((s) => (
                      <Chip key={s} active={serving === s} onClick={() => setServing(s)}>
                        {s} · {peso(friesPrice(product, s))}
                      </Chip>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <p className="opt-label">Flavor</p>
                    {tried && !flavor && <p className="text-[11px] font-semibold text-red-700">Pick one</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FRIES_FLAVORS.map((fl) => (
                      <Chip key={fl} active={flavor === fl} onClick={() => setFlavor(fl)}>
                        {fl}
                      </Chip>
                    ))}
                  </div>
                </section>
              </>
            )}

            {hotAllowed && (
              <section>
                <p className="opt-label mb-3">Serving</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={temp === "Iced"} onClick={() => setTemp("Iced")}>
                    Iced
                  </Chip>
                  <Chip active={temp === "Hot"} onClick={() => setTemp("Hot")}>
                    Hot · {HOT_SIZE} only
                  </Chip>
                </div>
              </section>
            )}

            {isDrink && (
              <section>
                <p className="opt-label mb-3">Size</p>
                {isHot ? (
                  <p className="rounded-xl bg-earth-100 px-4 py-3 text-xs leading-5 text-earth-700">
                    Hot drinks are served in {HOT_SIZE} only. Choose “Iced” to pick 16oz or 22oz.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <Chip key={s} active={size === s} onClick={() => setSize(s)}>
                        {s} · {peso(unitPrice(product, s))}
                      </Chip>
                    ))}
                  </div>
                )}
              </section>
            )}

            {isDrink && (
              <section>
                <p className="opt-label mb-3">Sugar level</p>
                <div className="flex flex-wrap gap-2">
                  {SUGAR_LEVELS.map((s) => (
                    <Chip key={s.value} active={sugar === s.value} onClick={() => setSugar(s.value)}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </section>
            )}

            {addonOptions.length > 0 && (
              <section>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="opt-label">Add-ons</p>
                  <p className="text-[11px] text-earth-600">
                    {addons.length ? `${addons.length} selected` : "Optional"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {addonOptions.map((a) => (
                    <Chip key={a} active={addons.includes(a)} onClick={() => toggleAddon(a)}>
                      {a} · +{peso(addonPrice(a, product))}
                    </Chip>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-earth-200 pt-5">
              <div className="flex items-center gap-1 rounded-full border border-earth-300 p-1">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid size-9 place-items-center rounded-full hover:bg-earth-100"
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" size={16} />
                </button>
                <span className="w-8 text-center text-sm font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="grid size-9 place-items-center rounded-full hover:bg-earth-100"
                  aria-label="Increase quantity"
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <button
                onClick={submit}
                aria-disabled={needsPick}
                className={`primary-button flex-1 ${needsPick ? "opacity-60" : ""}`}
              >
                {needsPick ? "Pick serving & flavor" : `${line ? "Update item" : "Add to cart"} · ${peso(price * qty)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

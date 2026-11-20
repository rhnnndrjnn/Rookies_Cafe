/* ------------------------------------------------------------------ */
/* Rookies Cafe — business info                                     */
/* ------------------------------------------------------------------ */

export const BUSINESS = {
  name: "Rookies Cafe Teresa Rizal",
  short: "Rookies Cafe",
  tagline: "Good Coffee. Great Moments.",
  subTagline: "Freshly brewed. Freshly made. Made for every coffee craving.",
  // Set VITE_CAFE_ADDRESS in .env to show your exact street address on the Contacts page.
  address: import.meta.env.VITE_CAFE_ADDRESS || "",
  // What Google Maps searches for. For a pin on the exact door, set VITE_MAP_QUERY in .env to
  // your full address, a Plus Code, or "latitude,longitude".
  mapQuery:
    import.meta.env.VITE_MAP_QUERY ||
    import.meta.env.VITE_CAFE_ADDRESS ||
    "Rookies Cafe, Teresa, Rizal, Philippines",
  socials: [
    { label: "Facebook", handle: "rookiescafe", url: "https://www.facebook.com/share/1D51sHzRpC/?mibextid=wwXIfr" },
    { label: "Instagram", handle: "@rookiescafe_", url: "https://www.instagram.com/rookiescafe_" },
    { label: "TikTok", handle: "@rookies.cafe", url: "https://www.tiktok.com/@rookies.cafe" },
  ],
}

// Orders are finished in Messenger. Set VITE_MESSENGER_USERNAME in .env if the Facebook page's
// username (the part after facebook.com/) is different from "rookiescafe".
// The cafe's real Facebook page. Messenger page ID 106142105566750 = messenger.com/t/106142105566750.
export const FACEBOOK_PAGE_URL = "https://www.facebook.com/share/1D51sHzRpC/?mibextid=wwXIfr"
// Messenger needs the page's username or numeric ID (a share link can't be turned into one
// automatically). Set VITE_MESSENGER_ID in .env — until then we open the real page instead of
// guessing a username, so customers never land on a different account.
export const MESSENGER_USERNAME = import.meta.env.VITE_MESSENGER_ID || import.meta.env.VITE_MESSENGER_USERNAME || "106142105566750"
// Messenger can't be pasted into by a website, so the text is copied to the clipboard AND sent as
// ?text= (honoured by some Messenger versions). Where it's ignored, the customer just pastes.
export const messengerUrl = (text = "") =>
  MESSENGER_USERNAME
    ? `https://m.me/${MESSENGER_USERNAME}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    : FACEBOOK_PAGE_URL

export const mapEmbedUrl = (q = BUSINESS.mapQuery) =>
  `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`
export const mapOpenUrl = (q = BUSINESS.mapQuery) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
export const mapDirectionsUrl = (q = BUSINESS.mapQuery) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`

// Supabase Storage bucket (receipts, product photos, QR codes) — must match schema.sql
export const BUCKET = "The Rookie Cafe"

/* ------------------------------------------------------------------ */
/* Menu structure                                                      */
/* ------------------------------------------------------------------ */
export const CATEGORIES = ["Classic", "Premium", "Matcha", "Non-Espresso", "Snacks"]
// Sugar choices shown to customers. `value` is what is stored in the cart / order.
export const SUGAR_LEVELS = [
  { value: 0, label: "Zero", text: "Zero sugar" },
  { value: 50, label: "Less", text: "Less sugar" },
  { value: 100, label: "Standard", text: "Standard sugar" },
  { value: 150, label: "Extra sweet", text: "Extra sweet" },
]
export const DEFAULT_SUGAR = 100
// Older carts / orders stored a percentage (25, 75…): show those as-is.
export const sugarLabel = (v) => SUGAR_LEVELS.find((s) => s.value === Number(v))?.text ?? `${v}% sugar`

// Add-on prices from the drink menu ("Add Ons" panel).
export const ADDON_PRICES = {
  "Espresso shot": 25,
  "Syrup / Sauce": 20,
  Milk: 25,
  "Whipped cream": 30,
  "Sea salt cream": 30,
}
export const ADDON_PRICE = 25 // legacy fallback for add-ons not listed above
export const SIZE_UPCHARGE = 35 // Upsize 16oz → 22oz

export const DRINK_CATEGORIES = CATEGORIES.filter((c) => c !== "Snacks")
export const isDrinkCategory = (c) => DRINK_CATEGORIES.includes(c)
export const SIZES = ["16oz", "22oz"]

// Flavored Fries is ONE snack: the customer picks a serving (Solo / Sharing) and a flavor.
// product.price = Solo price, product.price_22 = Sharing price (the owner can edit both).
export const FRIES_SERVINGS = ["Solo", "Sharing"]
export const FRIES_FLAVORS = ["BBQ", "Cheese", "Sour Cream"]
export const FRIES_SHARING_DEFAULT = 85
export const isFries = (p) => p?.category === "Snacks" && /^flavored fries/i.test(p?.name || "")
export const friesPrice = (product, serving) =>
  serving === "Sharing"
    ? Number(product.price_22 ?? FRIES_SHARING_DEFAULT)
    : Number(product.price)
export const HOT_SIZE = "8oz" // hot drinks are served in one size only
// Espresso-based categories — these default to "can be served hot" in the seed menu.
const HOT_CATEGORIES = ["Classic", "Premium"]
// Individual drinks outside those categories that can also be served hot.
// (Strawberry Matcha and Blueberry Matcha are iced only.)
const HOT_DRINKS = ["Dirty Matcha", "Matcha Latte", "White Chocolate Matcha", "Matcha Biscoff", "Cocoa"]

const DRINK_ADDONS = Object.keys(ADDON_PRICES)
export const ADDONS = {
  Classic: DRINK_ADDONS,
  Premium: DRINK_ADDONS,
  Matcha: DRINK_ADDONS,
  "Non-Espresso": DRINK_ADDONS,
  Snacks: [],
}

// The owner only works with two states. (Older orders may still carry preparing/ready/cancelled,
// so those labels stay for display.)
export const ORDER_STATUSES = ["pending", "completed"]
export const STATUS_LABEL = {
  pending: "Pending",
  completed: "Completed",
  preparing: "Pending",
  ready: "Pending",
  cancelled: "Cancelled",
}

export const ORDER_TYPES = [
  { id: "take_out", title: "Take out", sub: "Pick up and go", icon: "bag", timeLabel: "Arrival time" },
  { id: "dine_in", title: "Dine in", sub: "Enjoy it in the cafe", icon: "cup", timeLabel: "Arrival time" },
  { id: "delivery", title: "Delivery", sub: "Brought to your address", icon: "pin", timeLabel: "Delivery time" },
]
export const ORDER_TYPE_LABEL = { take_out: "Take out", dine_in: "Dine in", delivery: "Delivery" }
export const PAYMENT_LABEL = {
  unpaid: "Unpaid",
  verifying: "Awaiting payment proof",
  paid: "Paid",
  rejected: "Payment rejected",
}

// How customers can pay. Cash is settled with the cafe; GCash and QRPh are paid in the customer's
// own app. Every order is finished in Messenger (the customer sends the copied order there, plus
// their payment screenshot for GCash / QRPh) — no payment details are collected on this site.
export const PAYMENT_METHODS = [
  { id: "cash", title: "Cash", sub: "Pay in cash", icon: "cash" },
  { id: "gcash", title: "GCash", sub: "Save QR or copy number", icon: "qr", receipt: true },
  { id: "qrph", title: "QRPh", sub: "Any bank or e-wallet app", icon: "qr", receipt: true },
]
export const METHOD_LABEL = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "QRPh",
  // legacy values from older orders
  debit_card: "Debit card",
  credit_card: "Credit card",
}
// GCash / QRPh need a payment screenshot, which the customer sends in Messenger.
export const needsReceipt = (method) => method === "gcash" || method === "qrph"
export const atCounter = (method) => !needsReceipt(method)

// Opening hours: [open, close] in 24h. Used to limit the arrival-time clock (not shown on the site).
export const HOURS = { weekday: [10, 22], weekend: [10, 23] }

const hourLabel = (h) => `${((h + 11) % 12) + 1}:00 ${h < 12 || h === 24 ? "AM" : "PM"}`
export const hoursText = (range) => `${hourLabel(range[0])} — ${hourLabel(range[1])}`

export const peso = (n) => `₱${Number(n || 0).toFixed(2)}`
export const pesoWhole = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`

export const addonPrice = (name) => ADDON_PRICES[name] ?? ADDON_PRICE

export const unitPrice = (product, size, addons = []) => {
  const base =
    size === "22oz"
      ? Number(product.price_22 ?? Number(product.price) + SIZE_UPCHARGE)
      : Number(product.price)
  return base + addons.reduce((sum, a) => sum + addonPrice(a), 0)
}

export const lineSummary = (line) => {
  const parts = []
  if (line.serving) parts.push(line.serving)
  if (line.flavor) parts.push(line.flavor)
  if (line.temp) parts.push(`${line.temp} ${line.size}`)
  else if (line.size) parts.push(line.size)
  if (line.sugar !== undefined && line.sugar !== null && line.sugar !== "")
    parts.push(sugarLabel(line.sugar))
  if (line.addons?.length) parts.push(`+ ${line.addons.join(", ")}`)
  return parts.join(" · ")
}

export const makeOrderCode = () => {
  const d = new Date()
  const stamp = `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  return `ROOK-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`
}

export const timeAgo = (iso) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
}

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

export const image = (id, width = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`

/* ------------------------------------------------------------------ */
/* Mobile Coffee Cart — event packages                                 */
/* ------------------------------------------------------------------ */
export const PACKAGES = [
  { name: "Classic", guests: 50, price: 7799, cash: 7599, classic: 2, premium: 3 },
  { name: "Signature", guests: 100, price: 13799, cash: 13499, classic: 2, premium: 4 },
  { name: "Premier", guests: 150, price: 19799, cash: 19299, classic: 2, premium: 5 },
]
export const PACKAGE_INCLUSIONS = [
  "1 freshly prepared drink per guest",
  "12oz iced drinks / 8oz hot drinks",
  "Client-selected drink flavors",
  "1 professional barista and 1 assistant",
  "Arabica blend coffee beans",
  "Espresso machine and coffee grinder",
  "Premium syrups, sauces and ingredients",
  "Customized event menu",
  "Mobile coffee cart setup and service",
]
export const PACKAGE_SERVICE = "2–3 hours of coffee cart service"
export const PACKAGE_EXTRA_FLAVOR = 300 // per additional premium flavor selection
export const PACKAGE_PAYMENTS = ["Cash", "GCash", "QRPh"]
export const PACKAGE_OCCASIONS = [
  "Weddings",
  "Birthdays",
  "Debuts",
  "Baptisms",
  "Anniversaries",
  "Corporate Events",
  "Private Celebrations",
]

/* ------------------------------------------------------------------ */
/* Seed menu                                                           */
/* ------------------------------------------------------------------ */
// Prices from the printed drink menu and snack menu (16oz; upsize to 22oz is +SIZE_UPCHARGE).
export const PRICES = {
  classic: 105,
  premium: 120,
  matcha: 120,
  nonEspresso: 120,
  nachos: 125, // sharing
  cheesyFries: 125, // sharing
  flavoredFriesSolo: 35,
  flavoredFriesSharing: 85,
}

const IMG = {
  iced: "photo-1553329537-7a06eb26021c",
  latte: "photo-1565252556328-92ee4a9a0983",
  americano: "photo-1593200934786-75d1c755ceb3",
  cappuccino: "photo-1520903304654-28bd223f96d7",
  mocha: "photo-1572490122747-3968b75cc699",
  caramel: "photo-1577805947697-89e18249d767",
  matcha: "photo-1515823662972-da6a2e4d3002",
  cocoa: "photo-1579954115545-a95591f28bfc",
  berry: "photo-1558160074-4d7d8bdf4256",
  cream: "photo-1525803377221-4f6ccdaa5133",
}

// [name, detail, price, category, image]
const DRINKS = [
  // Espresso Favorites — Classic
  ["Americano", "Bold espresso over ice and water", PRICES.classic, "Classic", IMG.americano],
  ["Cappuccino", "Espresso with milk and a cocoa-dusted cream top", PRICES.classic, "Classic", IMG.cappuccino],
  ["Spanish Latte", "Espresso with sweetened condensed milk", PRICES.classic, "Classic", IMG.iced],

  // Espresso Favorites — Premium
  ["Sea Salt Latte", "Espresso latte topped with a silky sea salt cream", PRICES.premium, "Premium", IMG.latte],
  ["Rookies Special", "Our signature iced latte with caramel drizzle and a cocoa-dusted cream top", PRICES.premium, "Premium", IMG.caramel],
  ["Caramel Macchiato", "Espresso, milk, and rich caramel drizzle", PRICES.premium, "Premium", IMG.caramel],
  ["White Mocha", "Espresso with creamy white chocolate", PRICES.premium, "Premium", IMG.latte],
  ["Cafe Mocha", "Espresso with dark chocolate and milk", PRICES.premium, "Premium", IMG.mocha],
  ["Vanilla Latte", "Espresso, milk, and sweet vanilla", PRICES.premium, "Premium", IMG.cappuccino],
  ["Salted Caramel", "Espresso, milk, and salted caramel", PRICES.premium, "Premium", IMG.caramel],
  ["Hazelnut Latte", "Espresso with toasted hazelnut and milk", PRICES.premium, "Premium", IMG.iced],
  ["Biscoff Latte", "Espresso with caramelized Biscoff", PRICES.premium, "Premium", IMG.caramel],

  // Matcha Favorites
  ["Dirty Matcha", "Matcha and fresh milk with a shot of espresso", PRICES.matcha, "Matcha", IMG.matcha],
  ["Matcha Latte", "Smooth matcha with fresh milk", PRICES.matcha, "Matcha", IMG.matcha],
  ["Strawberry Matcha", "Matcha over strawberry purée and milk", PRICES.matcha, "Matcha", IMG.matcha],
  ["White Chocolate Matcha", "Matcha with creamy white chocolate", PRICES.matcha, "Matcha", IMG.matcha],
  ["Matcha Biscoff", "Matcha with caramelized Biscoff", PRICES.matcha, "Matcha", IMG.matcha],
  ["Blueberry Matcha", "Matcha over blueberry purée and milk", PRICES.matcha, "Matcha", IMG.matcha],

  // Non-Espresso Favorites
  ["Cocoa", "Rich chocolate with chilled milk", PRICES.nonEspresso, "Non-Espresso", IMG.cocoa],
  ["Strawberry", "Strawberry purée with fresh milk", PRICES.nonEspresso, "Non-Espresso", IMG.berry],
  ["Blueberry", "Blueberry purée with fresh milk", PRICES.nonEspresso, "Non-Espresso", IMG.cream],
  ["Thai Pink Milk", "Sweet, creamy Thai-style pink milk over ice", PRICES.nonEspresso, "Non-Espresso", IMG.berry],
]

// [name, detail, price, price_22 (Sharing price for Flavored Fries)]
const SNACKS = [
  ["Cheesy Beef Nachos", "Nachos loaded with beef and cheese sauce · Sharing", PRICES.nachos],
  ["Cheesy Fries", "Fries smothered in cheese sauce · Sharing", PRICES.cheesyFries],
  [
    "Flavored Fries",
    "Pick Solo or Sharing, then your flavor: BBQ, Cheese, or Sour Cream",
    PRICES.flavoredFriesSolo,
    PRICES.flavoredFriesSharing,
  ],
]

export const SEED_PRODUCTS = [
  ...DRINKS.map(([name, detail, price, category, img]) => ({
    name,
    detail,
    price,
    price_22: price + SIZE_UPCHARGE,
    category,
    image: image(img),
    available: true,
    has_hot: HOT_CATEGORIES.includes(category) || HOT_DRINKS.includes(name),
  })),
  ...SNACKS.map(([name, detail, price, price22]) => ({
    name,
    detail,
    price,
    price_22: price22 ?? null,
    category: "Snacks",
    image: "", // add a photo from Owner portal → Products
    available: true,
    has_hot: false,
  })),
]

/* ------------------------------------------------------------------ */
/* Event bookings (mobile coffee cart)                                 */
/* ------------------------------------------------------------------ */
export const BOOKING_LEAD_DAYS = 3 // earliest bookable day = today + 3
export const BOOKING_MAX_MONTHS = 12 // how far ahead the calendar goes
export const BOOKING_STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  blocked: "Blocked",
}
// statuses that occupy a day (one event per day — the cart is a single unit)
export const BOOKING_HOLDS_DAY = ["pending", "confirmed", "blocked"]

const pad = (n) => String(n).padStart(2, "0")
/** Local date -> "YYYY-MM-DD" (matches the Postgres `date` column; avoids timezone drift). */
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (str) => {
  const [y, m, d] = String(str).split("-").map(Number)
  return new Date(y, m - 1, d)
}
export const fmtDay = (str, opts) =>
  parseYmd(str).toLocaleDateString(
    "en-PH",
    opts || { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  )
export const earliestBookable = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + BOOKING_LEAD_DAYS)
  return ymd(d)
}
export const makeBookingCode = () => {
  const d = new Date()
  return `EVT-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`
}

import { useCallback, useEffect, useState } from "react"
import { NotifyProvider, useNotify } from "./lib/notify.jsx"
import { useCart } from "./lib/cart.js"
import { useMenuData, useMyOrders } from "./lib/hooks.js"
import { resolveCategories, resolveContacts } from "./lib/constants.js"
import Splash from "./components/Splash.jsx"
import ProductModal from "./components/ProductModal.jsx"
import { CorporateFooter, Navbar, StatusBanner, navItems } from "./components/Shell.jsx"
import HomePage from "./pages/Home.jsx"
import AboutPage from "./pages/About.jsx"
import MenuPage from "./pages/Menu.jsx"
import ContactsPage from "./pages/Contacts.jsx"
import PackagesPage from "./pages/Packages.jsx"
import BookPage from "./pages/Book.jsx"
import CartPage from "./pages/Cart.jsx"
import CheckoutPage from "./pages/Checkout.jsx"
import OrdersPage from "./pages/Orders.jsx"
import OwnerPortal from "./pages/Owner.jsx"

const customerPaths = [...navItems.map((i) => i.path), "/packages", "/book", "/cart", "/checkout"]
const staffPaths = ["/owner"]

const getRoute = () => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/"
  return customerPaths.includes(path) || staffPaths.includes(path) ? path : "/"
}

function CustomerSite({ route, navigate }) {
  const notify = useNotify()
  const cart = useCart()
  const menu = useMenuData()
  const myOrders = useMyOrders(route === "/orders")
  const [query, setQuery] = useState("")
  const [modal, setModal] = useState(null) // { product, line? }

  const storeOpen = menu.settings.store_open?.open !== false
  const categories = resolveCategories(menu.settings, menu.products)

  const openProduct = useCallback((product) => setModal({ product }), [])
  const editLine = (line) => {
    const product = menu.products.find((p) => p.id === line.productId)
    if (!product) return notify("That item is no longer on the menu", "Please remove it from your cart.", { tone: "error" })
    setModal({ product, line })
  }

  const submitModal = (line) => {
    if (modal.line) {
      cart.updateLine(modal.line.id, line)
      notify("Cart updated", line.name, { tone: "success" })
    } else {
      cart.addLine(line)
      notify("Added to cart", `${line.qty}× ${line.name}`, { tone: "success" })
    }
    setModal(null)
  }

  const pages = {
    "/": <HomePage navigate={navigate} products={menu.products} openProduct={openProduct} events={menu.settings.events} content={menu.settings.home} contacts={menu.settings.contacts} />,
    "/about": <AboutPage navigate={navigate} content={menu.settings.about} />,
    "/menu": (
      <MenuPage
        products={menu.products}
        categories={categories}
        loading={menu.loading}
        error={menu.error}
        query={query}
        setQuery={setQuery}
        openProduct={openProduct}
      />
    ),
    "/orders": <OrdersPage navigate={navigate} myOrders={myOrders} />,
    "/contacts": <ContactsPage content={menu.settings.contacts} />,
    "/packages": <PackagesPage navigate={navigate} content={menu.settings.events} />,
    "/book": <BookPage navigate={navigate} content={menu.settings.events} bookingPolicy={menu.settings.booking_policy} />,
    "/cart": (
      <CartPage
        cart={cart}
        navigate={navigate}
        products={menu.products}
        onEdit={editLine}
        storeOpen={storeOpen}
      />
    ),
    "/checkout": (
      <CheckoutPage
        cart={cart}
        navigate={navigate}
        products={menu.products}
        settings={menu.settings}
        storeOpen={storeOpen}
      />
    ),
  }

  return (
    <div className="min-h-screen bg-earth-50 text-earth-900">
      <StatusBanner isOpen={storeOpen} />
      <Navbar
        route={route}
        navigate={navigate}
        cartCount={cart.count}
        query={query}
        setQuery={setQuery}
        products={menu.products}
      />
      <div className="pt-[102px] lg:pt-[151px]">{pages[route]}</div>
      <CorporateFooter socials={resolveContacts(menu.settings.contacts).socials} />
      {modal && (
        <ProductModal
          key={modal.line?.id || modal.product.id}
          product={modal.product}
          categories={categories}
          line={modal.line}
            onClose={() => setModal(null)}
          onSubmit={submitModal}
        />
      )}
    </div>
  )
}

function Root() {
  const [route, setRoute] = useState(getRoute)
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const onPopState = () => {
      setRoute(getRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const navigate = useCallback((path) => {
    if (window.location.pathname !== path) window.history.pushState({}, "", path)
    setRoute(path)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <>
      {route === "/owner" ? (
        <OwnerPortal navigate={navigate} />
      ) : (
        <CustomerSite route={route} navigate={navigate} />
      )}
      {splash && <Splash onDone={() => setSplash(false)} />}
    </>
  )
}

export default function App() {
  return (
    <NotifyProvider>
      <Root />
    </NotifyProvider>
  )
}

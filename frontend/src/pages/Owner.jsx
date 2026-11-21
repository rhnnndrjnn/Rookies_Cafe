import { useEffect, useState } from "react"
import { getSession, logout } from "../lib/db.js"
import { useStaffData } from "../lib/staffData.js"
import { Spinner } from "../components/ui.jsx"
import { AccountPanel, LoginScreen, NotificationBell, StaffLayout, WrongRole } from "../components/staff/Shell.jsx"
import OrdersPanel, { OrderStats } from "../components/staff/Orders.jsx"
import TransactionsPanel from "../components/staff/Transactions.jsx"
import MessagesPanel from "../components/staff/Messages.jsx"
import ReviewsPanel from "../components/staff/Reviews.jsx"
import { isReview, parseReview, averageRating } from "../lib/reviews.js"
import ProductsManager from "../components/staff/Products.jsx"
import PaymentSettings, { StoreToggle } from "../components/staff/Settings.jsx"
import EventsPanel from "../components/staff/Events.jsx"
import AboutEditor from "../components/staff/AboutEditor.jsx"
import HomeEditor from "../components/staff/HomeEditor.jsx"
import ContactsEditor from "../components/staff/ContactsEditor.jsx"
import BookingPolicyEditor from "../components/staff/BookingPolicyEditor.jsx"
import EventsEditor from "../components/staff/EventsEditor.jsx"
import { PanelHeader } from "../components/staff/Shell.jsx"
import { STATUS_LABEL, fmtDateTime, peso } from "../lib/constants.js"

function Overview({ orders, bookings, reviews = [], goEvents, goOrders, goReviews }) {
  const parsedReviews = reviews.map((m) => ({ ...m, parsed: parseReview(m) })).filter((m) => m.parsed)
  const newReviews = parsedReviews.filter((m) => !m.read).length
  const recent = orders.slice(0, 6)
  const pendingEvents = bookings.filter((b) => b.status === "pending").length
  return (
    <div>
      <PanelHeader eyebrow="At a glance" title="Overview" />
      {pendingEvents > 0 && (
        <button
          onClick={goEvents}
          className="mb-5 flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E4CC87] bg-[#F8EBC6] px-5 py-4 text-left text-sm text-[#6B5311]"
        >
          <span>
            <strong>{pendingEvents} event {pendingEvents === 1 ? "request needs" : "requests need"} your answer</strong>
            <span className="block text-xs opacity-80">Open the calendar to confirm or decline.</span>
          </span>
          <span className="text-xs font-bold uppercase tracking-[.1em]">Review →</span>
        </button>
      )}
      {parsedReviews.length > 0 && (
        <button
          onClick={goReviews}
          className="mb-5 flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-earth-300 bg-earth-50 px-5 py-4 text-left text-sm shadow-sm"
        >
          <span>
            <strong>★ {averageRating(parsedReviews, "overall").toFixed(1)} / 5</strong> from {parsedReviews.length} {parsedReviews.length === 1 ? "review" : "reviews"}
            {newReviews > 0 && <span className="badge ml-2">{newReviews} new</span>}
            <span className="block text-xs text-earth-600">Private — only you can see customer feedback.</span>
          </span>
          <span className="text-xs font-bold uppercase tracking-[.1em]">Open →</span>
        </button>
      )}
      <OrderStats orders={orders} />
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">Recent orders</p>
        <button onClick={goOrders} className="text-[11px] font-bold uppercase tracking-[.1em] text-earth-600 underline underline-offset-4">All orders</button>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-sm">
        {recent.length === 0 && <li className="px-5 py-12 text-center text-sm text-earth-600">No orders yet.</li>}
        {recent.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-earth-200 p-3 text-sm last:border-b-0 sm:p-4">
            <span className="min-w-0">
              <strong>{o.code}</strong> · {o.customer_name}
              <span className="block text-xs text-earth-600">{fmtDateTime(o.created_at)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className={`badge ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
              <strong>{peso(o.total)}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OwnerApp({ session, setSession, navigate, onLogout }) {
  const data = useStaffData()
  const [tab, setTab] = useState("overview")
  const plainMessages = data.messages.filter((m) => !isReview(m)) // reviews live in their own tab
  const reviewMessages = data.messages.filter(isReview)
  const tabs = [
    { id: "overview", label: "Overview", icon: "chart" },
    { id: "orders", label: "Orders", icon: "bag", badge: data.orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length },
    { id: "products", label: "Products", icon: "cup" },
    { id: "events", label: "Event bookings", icon: "calendar", badge: data.bookings.filter((b) => b.status === "pending").length },
    { id: "transactions", label: "Transactions", icon: "receipt" },
    { id: "messages", label: "Messages", icon: "mail", badge: plainMessages.filter((m) => !m.read).length },
    { id: "reviews", label: "Reviews & Feedback", icon: "eye", badge: reviewMessages.filter((m) => !m.read).length },
    { id: "homepage", label: "Home page", icon: "eye" },
    { id: "about", label: "About page", icon: "eye" },
    { id: "eventspage", label: "Events page", icon: "eye" },
    { id: "contactspage", label: "Contacts page", icon: "eye" },
    { id: "bookingpolicy", label: "Booking policies", icon: "calendar" },
    { id: "payments", label: "Payment details", icon: "bag" },
    { id: "account", label: "My account", icon: "lock" },
  ]
  return (
    <StaffLayout
      role="owner"
      session={session}
      tabs={tabs}
      tab={tab}
      setTab={setTab}
      onLogout={onLogout}
      navigate={navigate}
      right={
        <>
          <StoreToggle settings={data.settings} session={session} />
          <NotificationBell canDelete notifications={data.notifications} navigate={(n) => setTab(n.type === "message" ? "messages" : n.type === "review" ? "reviews" : n.type === "booking" ? "events" : "orders")} />
        </>
      }
    >
      {data.loading ? (
        <Spinner />
      ) : data.error ? (
        <p className="rounded-2xl bg-[#F3DEDB] p-6 text-sm text-[#8F3B31]">{data.error}</p>
      ) : (
        <>
          {tab === "overview" && <Overview orders={data.orders} bookings={data.bookings} reviews={reviewMessages} goReviews={() => setTab("reviews")} goEvents={() => setTab("events")} goOrders={() => setTab("orders")} />}
          {tab === "orders" && <OrdersPanel orders={data.orders} storeOpen={data.settings.store_open?.open !== false} />}
          {tab === "products" && <ProductsManager products={data.products} settings={data.settings} />}
          {tab === "events" && <EventsPanel bookings={data.bookings} settings={data.settings} />}
          {tab === "transactions" && <TransactionsPanel orders={data.orders} />}
          {tab === "messages" && <MessagesPanel messages={plainMessages} canDelete />}
          {tab === "reviews" && <ReviewsPanel messages={data.messages} orders={data.orders} canDelete />}
          {tab === "homepage" && <HomeEditor settings={data.settings} products={data.products} />}
          {tab === "about" && <AboutEditor settings={data.settings} />}
          {tab === "eventspage" && <EventsEditor settings={data.settings} />}
          {tab === "contactspage" && <ContactsEditor settings={data.settings} />}
          {tab === "bookingpolicy" && <BookingPolicyEditor settings={data.settings} />}
          {tab === "payments" && <PaymentSettings settings={data.settings} />}
          {tab === "account" && <AccountPanel session={session} onSessionChange={setSession} />}
        </>
      )}
    </StaffLayout>
  )
}

export default function OwnerPortal({ navigate }) {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    getSession().then(setSession)
  }, [])
  const onLogout = async () => {
    await logout()
    setSession(null)
  }
  if (session === undefined) return <div className="min-h-screen bg-earth-100"><Spinner /></div>
  if (!session) return <LoginScreen role="owner" onLoggedIn={setSession} navigate={navigate} />
  if (session.role !== "owner") return <WrongRole session={session} role="owner" navigate={navigate} onLogout={onLogout} />
  return <OwnerApp session={session} setSession={setSession} navigate={navigate} onLogout={onLogout} />
}

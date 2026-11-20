import { useEffect, useRef, useState } from "react"
import logo from "../../assets/logo.png"
import { FieldMessage, Icon, Input } from "../ui.jsx"
import { changeCredentials, clearNotifications, deleteNotification, login, logout, markAllNotifications, markNotification } from "../../lib/db.js"
import { isDemo } from "../../lib/supabase.js"
import { timeAgo } from "../../lib/constants.js"
import { useNotify } from "../../lib/notify.jsx"
import { rules, useLiveForm } from "../../lib/validate.js"

/* ---------------------------------------------------------------- login */
export function LoginScreen({ role, onLoggedIn, navigate }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const title = "Owner Dashboard"

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      onLoggedIn(await login(username, password))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-earth-200 px-5 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-earth-300 bg-earth-50 shadow-2xl">
        <div className="bg-earth-900 px-8 py-8 text-earth-50">
          <img src={logo} alt="Rookies Cafe" className="h-12 w-auto object-contain" />
          <p className="eyebrow mt-6 !text-earth-300">Rookies Cafe Teresa Rizal</p>
          <h1 className="display-title mt-1 text-3xl">{title}</h1>
        </div>
        <form onSubmit={submit} className="space-y-5 p-8">
          <label className="block">
            <span className="opt-label">Username</span>
            <input
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-box mt-2"
            />
          </label>
          <label className="block">
            <span className="opt-label">Password</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-box mt-2"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-[#F3DEDB] p-3 text-xs text-[#8F3B31]">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary-button w-full disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"} <Icon name="arrow" size={17} />
          </button>
          {isDemo && (
            <p className="rounded-xl bg-earth-100 p-3 text-[11px] leading-5 text-earth-700">
              <strong>Demo mode</strong> (no Supabase keys set). Try{" "}
              <code>owner / owner123</code>.
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="block w-full text-center text-xs font-semibold underline underline-offset-4"
          >
            ← Back to the customer site
          </button>
        </form>
      </div>
    </main>
  )
}

export function WrongRole({ session, navigate, onLogout }) {
  return (
    <main className="grid min-h-screen place-items-center bg-earth-200 px-5">
      <div className="max-w-md rounded-3xl border border-earth-300 bg-earth-50 p-8 text-center shadow-xl">
        <p className="font-semibold">“{session.username}” is not an owner account.</p>
        <p className="mt-2 text-sm text-earth-600">Only the owner can open this dashboard.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="primary-button" onClick={() => navigate("/")}>
            Back to the site
          </button>
          <button className="secondary-button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}

/* ---------------------------------------------------------- notification bell */
export function NotificationBell({ notifications, navigate, canDelete = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const enableAlerts = async () => {
    if ("Notification" in window && Notification.permission === "default")
      await Notification.requestPermission()
    setOpen(false)
  }

  return (
    <div className="sm:relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative grid size-9 shrink-0 place-items-center sm:size-10 rounded-full border border-earth-300 transition hover:bg-earth-100"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-[#B5564A] px-1 text-[9px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px] rounded-2xl border border-earth-300 bg-earth-50 shadow-[0_18px_50px_rgba(32,24,19,.2)]">
          <div className="flex items-center justify-between border-b border-earth-200 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => markAllNotifications()}
                disabled={!unread}
                className="text-[11px] font-bold uppercase tracking-[.08em] text-earth-600 disabled:opacity-40"
              >
                Mark all read
              </button>
              {canDelete && (
                <button
                  onClick={() => notifications.length && window.confirm("Delete all notifications?") && clearNotifications()}
                  disabled={!notifications.length}
                  className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8F3B31] disabled:opacity-40"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-earth-600">Nothing yet.</li>
            )}
            {notifications.slice(0, 40).map((n) => (
              <li key={n.id} className="flex items-stretch border-b border-earth-200 last:border-b-0 hover:bg-earth-100">
                <button
                  onClick={() => {
                    markNotification(n.id)
                    navigate?.(n)
                    setOpen(false)
                  }}
                  className={`flex min-w-0 flex-1 gap-3 px-4 py-3 text-left ${
                    n.read ? "" : "bg-earth-100/70"
                  }`}
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[#B5564A]"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-earth-600">{n.body}</span>}
                    <span className="mt-0.5 block text-[10px] uppercase tracking-[.1em] text-earth-500">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                </button>
                {canDelete && (
                  <button
                    onClick={() => deleteNotification(n.id)}
                    aria-label={`Delete notification: ${n.title}`}
                    className="grid w-11 shrink-0 place-items-center text-earth-500 hover:text-[#8F3B31]"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {"Notification" in window && Notification.permission === "default" && (
            <button onClick={enableAlerts} className="w-full border-t border-earth-200 px-4 py-3 text-xs font-semibold text-earth-700 hover:bg-earth-100">
              Enable desktop alerts for new orders
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ layout */
export function StaffLayout({ role, session, tabs, tab, setTab, onLogout, navigate, children, right }) {
  const label = "Owner Dashboard"
  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-hidden bg-earth-100">
      <header className="sticky top-0 z-40 border-b border-earth-300 bg-earth-50">
        <div className="mx-auto flex min-h-14 max-w-[1600px] items-center justify-between gap-2 px-3 py-2 sm:min-h-16 sm:gap-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="Rookies Cafe" className="h-8 w-auto shrink-0 object-contain sm:h-10" />
            <div className="hidden min-w-0 sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-earth-600">{label}</p>
              <p className="truncate text-sm font-semibold">Hi, {session.username}</p>
            </div>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
            {right}
            <button onClick={() => navigate("/")} className="btn-sm hidden md:inline-flex whitespace-nowrap">
              Customer site
            </button>
            <button onClick={onLogout} className="btn-sm !px-2.5 sm:!px-4" aria-label="Sign out">
              <Icon name="logout" size={14} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1600px] gap-3 px-3 py-3 sm:gap-5 sm:px-8 sm:py-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:py-8 2xl:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="no-scrollbar sticky top-[56px] z-30 -mx-3 flex gap-1 overflow-x-auto border-b border-earth-300 bg-earth-100/95 px-3 py-2 backdrop-blur sm:top-16 sm:-mx-8 sm:px-8 lg:sticky lg:top-[88px] lg:mx-0 lg:h-fit lg:flex-col lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none" aria-label={`${label} sections`}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`staff-tab !w-auto shrink-0 lg:!w-full lg:shrink ${tab === t.id ? "active" : ""}`}
              style={tab === t.id ? { color: "#F6F1EF" } : undefined}
            >
              <Icon name={t.icon} size={17} />
              <span className="whitespace-nowrap">{t.label}</span>
              {t.badge > 0 && (
                <span className="ml-auto grid min-w-[20px] place-items-center rounded-full bg-[#B5564A] px-1.5 text-[10px] font-bold text-white">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="min-w-0 pb-8">{children}</div>
      </div>
    </div>
  )
}

export function PanelHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="display-title mt-1 text-2xl tracking-[-.03em] sm:text-4xl">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`switch ${on ? "on" : ""} disabled:opacity-50`}
    />
  )
}

/* ------------------------------------------------------------ credentials */
const ACCOUNT_RULES = {
  username: rules.username,
  next: (v) => rules.newPassword(v),
  confirm: (v, all) => (all.next && v !== all.next ? "Passwords don’t match yet." : ""),
  current: (v) => (v ? "" : "Enter your current password to save."),
}

export function AccountPanel({ session, onSessionChange }) {
  const notify = useNotify()
  const [username, setUsername] = useState(session.username)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const f = useLiveForm({ username, next, confirm, current }, ACCOUNT_RULES)

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    f.touchAll()
    if (!f.valid) return setError("Please fix the highlighted fields first.")
    if (next && next !== confirm) return setError("New password and confirmation don't match.")
    if (username.trim().toLowerCase() === session.username && !next)
      return setError("Change your username or enter a new password first.")
    setBusy(true)
    try {
      const updated = await changeCredentials(session, {
        username,
        currentPassword: current,
        newPassword: next,
      })
      onSessionChange(updated)
      setCurrent("")
      setNext("")
      setConfirm("")
      notify("Credentials updated", "Use your new details next time you sign in.", { tone: "success" })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PanelHeader eyebrow="Security" title="Your credentials" />
      <form onSubmit={submit} noValidate className="max-w-lg space-y-5 rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-sm sm:p-8">
        <label className="block">
          <span className="opt-label">Username</span>
          <Input value={username} onValue={setUsername} onBlur={() => f.blur("username")} error={f.shown("username")} className="input-box mt-2" autoComplete="username" />
          <FieldMessage error={f.shown("username")} />
        </label>
        <label className="block">
          <span className="opt-label">New password (leave blank to keep)</span>
          <Input type="password" value={next} onValue={setNext} onBlur={() => f.blur("next")} error={f.shown("next")} className="input-box mt-2" autoComplete="new-password" />
          <FieldMessage error={f.shown("next")} />
        </label>
        {next && (
          <label className="block">
            <span className="opt-label">Confirm new password</span>
            <Input type="password" value={confirm} onValue={setConfirm} onBlur={() => f.blur("confirm")} error={f.shown("confirm")} className="input-box mt-2" autoComplete="new-password" />
            <FieldMessage error={f.shown("confirm")} />
          </label>
        )}
        <label className="block border-t border-earth-200 pt-5">
          <span className="opt-label">Current password (required to save)</span>
          <Input type="password" value={current} onValue={setCurrent} onBlur={() => f.blur("current")} error={f.shown("current")} className="input-box mt-2" autoComplete="current-password" />
          <FieldMessage error={f.shown("current")} />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#F3DEDB] p-3 text-xs text-[#8F3B31]">{error}</p>}
        <button disabled={busy} className="primary-button disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  )
}

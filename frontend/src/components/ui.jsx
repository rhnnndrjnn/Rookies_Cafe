import { useEffect } from "react"
import { SANITIZERS } from "../lib/validate.js"

export function Icon({ name, size = 20 }) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="17" cy="20" r="1" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    bell: (
      <>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 21h4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V5" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 19h16" />
      </>
    ),
    logout: (
      <>
        <path d="M14 4h5v16h-5" />
        <path d="M4 12h11" />
        <path d="m11 8 4 4-4 4" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    store: (
      <>
        <path d="M4 9 5.5 4h13L20 9" />
        <path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" />
        <path d="M5 11v9h14v-9" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V5" />
        <path d="M4 20h16" />
        <path d="M8 16v-4M12 16V8M16 16v-6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    qr: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <path d="M14 14h2v2h-2zM18 14h2M14 18h2v2M18 18v2h2" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <circle cx="12" cy="12" r="2.4" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v11" />
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
        <path d="M5 20h14" />
      </>
    ),
    messenger: (
      <>
        <path d="M12 3.5c-4.7 0-8.5 3.5-8.5 7.9 0 2.4 1.1 4.5 2.9 5.9V21l2.9-1.6c.9.3 1.8.4 2.7.4 4.7 0 8.5-3.5 8.5-7.9S16.7 3.5 12 3.5Z" />
        <path d="m7.5 13.5 3.2-3.4 2.3 2.2 3.5-2.2-3.3 3.7-2.3-2.2-3.4 1.9Z" />
      </>
    ),
    chevronLeft: <path d="m15 6-6 6 6 6" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    cup: (
      <>
        <path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Z" />
        <path d="M17 10h1.5a2 2 0 0 1 0 4H17" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export function PageLink({ to, navigate, className = "", children, onClick, style }) {
  return (
    <a
      href={to}
      className={className}
      style={style}
      onClick={(event) => {
        event.preventDefault()
        onClick?.()
        navigate(to)
      }}
    >
      {children}
    </a>
  )
}

export function Modal({ open, onClose, children, wide = false, label }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-earth-950/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className={`modal-in max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-earth-50 shadow-2xl sm:rounded-3xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export function Chip({ active, disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`chip ${active ? "chip-active" : ""}`}
    >
      {children}
    </button>
  )
}

export function Spinner() {
  return (
    <div className="grid place-items-center py-20">
      <span className="size-7 animate-spin rounded-full border-2 border-earth-300 border-t-earth-700" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Form inputs with live validation                                    */
/* ------------------------------------------------------------------ */

/** Inline error (red) or hint (muted) under a field. Always announced to screen readers. */
export function FieldMessage({ error, hint, id }) {
  if (error)
    return (
      <p id={id} role="alert" className="field-error">
        <span aria-hidden="true">!</span> {error}
      </p>
    )
  if (hint)
    return (
      <p id={id} className="field-hint">
        {hint}
      </p>
    )
  return null
}

/**
 * <Input kind="phone" | "digits" | "decimal" value onValue={(clean) => …} error={…} />
 *
 * `kind` makes the field NUMERIC-ONLY: letters/symbols are blocked as you type and
 * stripped from anything pasted. `onValue` always receives the cleaned string.
 * Without `kind` it behaves like a normal text input.
 */
export function Input({ kind, onValue, onBlur, error, className = "input-box", ...props }) {
  const clean = kind ? SANITIZERS[kind] : (v) => v

  const onKeyDown = (e) => {
    props.onKeyDown?.(e)
    if (!kind || e.defaultPrevented) return
    // printable single characters only — leave Backspace, arrows, Ctrl/⌘ shortcuts alone
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
    const allowed = kind === "decimal" ? /[0-9.]/ : /[0-9]/
    if (!allowed.test(e.key)) e.preventDefault()
  }

  return (
    <input
      {...props}
      onKeyDown={onKeyDown}
      onChange={(e) => onValue?.(clean(e.target.value))}
      onBlur={onBlur}
      inputMode={kind === "decimal" ? "decimal" : kind ? "numeric" : props.inputMode}
      autoComplete={kind === "phone" ? "tel-national" : props.autoComplete}
      aria-invalid={error ? "true" : undefined}
      className={`${className} ${error ? "input-error" : ""}`}
    />
  )
}

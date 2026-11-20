import { useCallback, useMemo, useState } from "react"

/* ------------------------------------------------------------------ */
/* Input sanitizers — used so letters can never be typed or pasted      */
/* into numeric-only fields.                                            */
/* ------------------------------------------------------------------ */
export const digitsOnly = (v = "") => String(v).replace(/\D+/g, "")

/** Digits with at most one decimal point and 2 decimal places (prices). */
export const decimalOnly = (v = "") => {
  const s = String(v).replace(/[^\d.]/g, "")
  const i = s.indexOf(".")
  if (i === -1) return s
  return s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "").slice(0, 2)
}

/** PH mobile: digits only, max 11. Pasted "+63 9xx…" is converted to "09xx…". */
export const phoneOnly = (v = "") => {
  let d = digitsOnly(v)
  if (d.startsWith("639") && d.length > 11) d = "0" + d.slice(2)
  return d.slice(0, 11)
}

export const SANITIZERS = { digits: digitsOnly, decimal: decimalOnly, phone: phoneOnly }

/* ------------------------------------------------------------------ */
/* Rules: each returns an error message, or "" when the value is fine.  */
/* ------------------------------------------------------------------ */
const s = (v) => String(v ?? "").trim()

export const rules = {
  name: (v) => {
    const t = s(v)
    if (!t) return "Please enter your name."
    if (t.length < 2) return "Name is too short."
    if (t.length > 60) return "Name is too long (60 characters max)."
    if (!/^[\p{L}][\p{L} .'’-]*$/u.test(t)) return "Use letters only — no numbers or symbols."
    return ""
  },

  phone: (v) => {
    const t = s(v)
    if (!t) return "Enter your mobile number."
    if (!/^\d+$/.test(t)) return "Mobile number must contain numbers only."
    if (!t.startsWith("09")) return "Mobile number must start with 09."
    if (t.length < 11) return `Mobile number needs 11 digits (${t.length}/11).`
    return ""
  },

  phoneOptional: (v) => (s(v) ? rules.phone(v) : ""),

  email: (v) => {
    const t = s(v)
    if (!t) return "Enter your email address."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return "Enter a valid email, e.g. name@email.com."
    return ""
  },

  emailOptional: (v) => (s(v) ? rules.email(v) : ""),

  message: (v) => {
    const t = s(v)
    if (!t) return "Please write your message."
    if (t.length < 10) return `Message is too short (${t.length}/10 characters).`
    if (t.length > 1000) return "Message is too long (1000 characters max)."
    return ""
  },

  price: (v) => {
    const t = s(v)
    if (!t) return "Enter a price."
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return "Price must be a number, e.g. 135 or 135.50."
    if (!(Number(t) > 0)) return "Price must be more than ₱0."
    if (Number(t) > 100000) return "That price looks too high."
    return ""
  },

  priceOptional: (v) => (s(v) ? rules.price(v) : ""),

  username: (v) => {
    const t = s(v)
    if (!t) return "Enter a username."
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(t)) return "At least 3 characters: letters, numbers, . _ -"
    return ""
  },

  newPassword: (v) => (!v ? "" : v.length < 6 ? `Password needs at least 6 characters (${v.length}/6).` : ""),

  required: (label) => (v) => (s(v) ? "" : `${label} is required.`),
}

/* ------------------------------------------------------------------ */
/* useLiveForm — errors appear while the user types / leaves a field,   */
/* NOT only after pressing submit.                                      */
/*                                                                      */
/*   const f = useLiveForm(values, RULES)   // RULES = module constant  */
/*   f.shown("phone")  → message to display ("" until the field has     */
/*                       content or has been visited)                   */
/*   f.blur("phone")   → call from onBlur                               */
/*   f.touchAll()      → call on submit so every error is revealed      */
/*   f.valid           → true when no rule fails                        */
/* ------------------------------------------------------------------ */
export function useLiveForm(values, ruleSet) {
  const [touched, setTouched] = useState({})

  const errors = useMemo(() => {
    const out = {}
    for (const key of Object.keys(ruleSet)) out[key] = ruleSet[key](values[key], values) || ""
    return out
  }, [values, ruleSet])

  const blur = useCallback((key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true })), [])
  const touchAll = useCallback(
    () => setTouched(Object.fromEntries(Object.keys(ruleSet).map((k) => [k, true]))),
    [ruleSet],
  )
  const untouch = useCallback(() => setTouched({}), [])

  const shown = (key) => (touched[key] || s(values[key]) !== "" ? errors[key] || "" : "")
  const valid = Object.values(errors).every((e) => !e)
  const firstError = Object.values(errors).find(Boolean) || ""

  return { errors, shown, blur, touchAll, untouch, valid, firstError }
}

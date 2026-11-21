import { useEffect, useState } from "react"
import { FieldMessage, Icon, Input, PageLink } from "../components/ui.jsx"
import { VOUCHER_AMOUNT, checkVoucher, getLocalVoucher, saveLocalVoucher, voucherCodeFor } from "../lib/voucher.js"
import { isEmailVerified, sendEmailCode, verifyEmailCode } from "../lib/emailVerify.js"
import { RATING_FIELDS, RATING_WORDS } from "../lib/reviews.js"
import { submitReview } from "../lib/db.js"
import { copyText } from "../lib/orderMessage.js"
import { useNotify } from "../lib/notify.jsx"
import { rules, useLiveForm } from "../lib/validate.js"

const RULES = {
  name: rules.name,
  email: rules.email,
  comment: (v) => {
    const t = String(v || "").trim()
    if (!t) return "Please tell us a little about your visit."
    if (t.length < 5) return "Please write at least a few words."
    if (t.length > 500) return "Please keep your comment under 500 characters."
    return ""
  },
}

function StarIcon({ filled, size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9z"
        fill={filled ? "#E0A528" : "none"}
        stroke={filled ? "#C58C12" : "#A89488"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 1–5 star picker. Keyboard: arrow keys change the value. */
function StarRating({ label, hint, value, onChange, error }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="rounded-2xl border border-earth-300 bg-white/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label} <span className="text-[#8F3B31]" aria-hidden="true">*</span></p>
          <p className="text-[11px] text-earth-600">{hint}</p>
        </div>
        <span className="min-w-[72px] text-right text-xs font-bold uppercase tracking-[.1em] text-earth-600" aria-live="polite">
          {RATING_WORDS[shown] || ""}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-2 flex gap-1"
        onMouseLeave={() => setHover(0)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault()
            onChange(Math.min(5, (value || 0) + 1))
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault()
            onChange(Math.max(1, (value || 2) - 1))
          }
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""} — ${RATING_WORDS[n]}`}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-lg p-1 transition hover:scale-110"
          >
            <StarIcon filled={n <= shown} />
          </button>
        ))}
      </div>
      <FieldMessage error={error} />
    </div>
  )
}

/** The voucher the customer earned (or already has), with its current status. */
function VoucherCard({ code, used, navigate, justEarned }) {
  const notify = useNotify()
  const copy = async () =>
    notify((await copyText(code)) ? "Voucher code copied" : "Couldn’t copy — select the code instead", code, { tone: "success" })
  return (
    <div className="rounded-3xl border-2 border-dashed border-earth-700 bg-earth-50 p-6 text-center shadow-xl sm:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#CBE6CF] text-[#1F5A2B]">
        <Icon name="check" size={26} />
      </span>
      <p className="eyebrow mt-5">{justEarned ? "Thank you for your review!" : "Your review voucher"}</p>
      <h2 className="display-title mt-2 text-4xl sm:text-5xl">₱{VOUCHER_AMOUNT} off</h2>
      <p className="mt-2 text-sm text-earth-600">for your next order at Rookies Cafe Teresa Rizal</p>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-[.16em] text-earth-600">Voucher code</p>
      <p className="display-title mt-1 select-all break-all text-2xl tracking-wide sm:text-3xl">{code}</p>
      <div className="mt-2 flex justify-center">
        <span className={`badge ${used ? "cancelled" : "completed"}`}>{used ? "Already used" : "Available"}</span>
      </div>

      {used ? (
        <p className="mt-5 rounded-xl bg-earth-100 p-3 text-xs leading-5 text-earth-700">
          This voucher has been used on an order. Each email and browser can receive one voucher only.
        </p>
      ) : (
        <>
          <p className="mt-5 rounded-xl bg-earth-100 p-3 text-xs leading-5 text-earth-700">
            It’s saved on this device and it’s <strong>your choice</strong> — at checkout you can tick “Use my ₱{VOUCHER_AMOUNT} voucher”
            or keep it for a later order. One use only.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={copy} className="secondary-button">
              <Icon name="copy" size={17} /> Copy code
            </button>
            <PageLink to="/menu" navigate={navigate} className="primary-button">
              Order now <Icon name="arrow" size={17} />
            </PageLink>
          </div>
        </>
      )}
    </div>
  )
}

export default function FeedbackPage({ navigate }) {
  const notify = useNotify()
  const [local, setLocal] = useState(getLocalVoucher)
  const [justEarned, setJustEarned] = useState(false)
  const [used, setUsed] = useState(!!local?.usedAt)
  const [name, setName] = useState("")
  const [email, setEmail] = useState(local?.email || "")
  const [comment, setComment] = useState("")
  const [ratings, setRatings] = useState({})
  const [ratingErr, setRatingErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const f = useLiveForm({ name, email, comment }, RULES)
  const [step, setStep] = useState(() => (local?.email && isEmailVerified(local.email) ? "verified" : "idle")) // idle | sent | verified
  const [code, setCode] = useState("")
  const [mailBusy, setMailBusy] = useState(false)
  const [mailMsg, setMailMsg] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async () => {
    setMailMsg("")
    setError("")
    f.blur("email")
    if (rules.email(email)) return
    setMailBusy(true)
    try {
      // Don't waste an email if this address already received its voucher.
      if (!local) {
        const { valid } = await checkVoucher(await voucherCodeFor(email))
        if (valid) throw new Error("This email has already received a ₱100 review voucher.")
      }
      await sendEmailCode(email)
      setStep("sent")
      setCode("")
      setCooldown(60)
      setMailMsg(`We emailed a code to ${email.trim()}. It can take a minute — check spam too.`)
    } catch (err) {
      setMailMsg(err.message)
    } finally {
      setMailBusy(false)
    }
  }

  const confirmCode = async () => {
    setMailMsg("")
    setMailBusy(true)
    try {
      await verifyEmailCode(email, code)
      setStep("verified")
      setMailMsg("")
    } catch (err) {
      setMailMsg(err.message)
    } finally {
      setMailBusy(false)
    }
  }

  const changeEmail = () => {
    setStep("idle")
    setCode("")
    setMailMsg("")
  }

  const hasVoucher = !!local?.reviewSaved

  // Keep the voucher status honest (it may have been spent from another browser).
  useEffect(() => {
    if (!hasVoucher || used) return
    checkVoucher(local.code)
      .then((r) => {
        if (r.used) {
          saveLocalVoucher({ usedAt: new Date().toISOString() })
          setUsed(true)
        }
      })
      .catch(() => {})
  }, [hasVoucher, used, local?.code])

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    f.touchAll()
    const missing = RATING_FIELDS.some((r) => !ratings[r.id])
    setRatingErr(missing)
    if (!f.valid) return setError("Please fix the highlighted fields first.")
    if (step !== "verified" || !isEmailVerified(email)) return setError("Please verify your email with the code we send you.")
    if (missing) return setError("Please tap the stars for every rating.")
    setBusy(true)
    try {
      await submitReview({ name: name.trim(), email: email.trim(), ratings, comment: comment.trim() })
      setLocal(getLocalVoucher())
      setJustEarned(true)
      notify("Review sent", `Your ₱${VOUCHER_AMOUNT} voucher is ready.`, { tone: "success" })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[70vh] bg-earth-200">
      <section className="border-b border-earth-300 bg-earth-100 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[900px]">
          <p className="eyebrow">Tell us how we did</p>
          <h1 className="display-title mt-3 text-6xl tracking-[-.05em] sm:text-7xl">Feedback</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-earth-600">
            Rate your visit and get a <strong>₱{VOUCHER_AMOUNT} voucher</strong> for your next order — one voucher per email and per
            browser. Your review helps the whole Rookies Cafe team improve.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-[900px]">
          {hasVoucher ? (
            <VoucherCard code={local.code} used={used} navigate={navigate} justEarned={justEarned} />
          ) : (
            <form onSubmit={submit} noValidate className="space-y-6">
              <div className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-8">
                <p className="eyebrow">1 · Your ratings (all required)</p>
                <p className="mt-2 text-xs text-earth-600" aria-live="polite">
                  {RATING_FIELDS.filter((r) => ratings[r.id]).length} of {RATING_FIELDS.length} rated
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {RATING_FIELDS.map((r, i) => (
                    <div key={r.id} className={i === 0 ? "sm:col-span-2" : ""}>
                      <StarRating
                        label={r.label}
                        hint={r.hint}
                        value={ratings[r.id] || 0}
                        onChange={(n) => setRatings((x) => ({ ...x, [r.id]: n }))}
                        error={ratingErr && !ratings[r.id] ? "Tap a star to rate." : ""}
                      />
                    </div>
                  ))}
                </div>
                <label className="mt-5 block">
                  <span className="opt-label">Your comments <span className="text-[#8F3B31]">*</span></span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onBlur={() => f.blur("comment")}
                    rows={4}
                    maxLength={500}
                    placeholder="What did you love? What can we do better?"
                    className="input-box mt-2 resize-y"
                  />
                  <FieldMessage error={f.shown("comment")} hint={`${comment.length}/500`} />
                </label>
              </div>

              <div className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-8">
                <p className="eyebrow">2 · Where should we send your voucher?</p>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="opt-label">Name</span>
                    <Input
                      value={name}
                      onValue={setName}
                      onBlur={() => f.blur("name")}
                      error={f.shown("name")}
                      placeholder="Your name"
                      autoComplete="name"
                      maxLength={60}
                      className="input-box mt-2"
                    />
                    <FieldMessage error={f.shown("name")} />
                  </label>
                  <div className="block">
                    <label>
                      <span className="opt-label">Email</span>
                      <Input
                        type="email"
                        value={email}
                        onValue={setEmail}
                        onBlur={() => f.blur("email")}
                        error={f.shown("email")}
                        placeholder="name@email.com"
                        autoComplete="email"
                        className="input-box mt-2"
                        readOnly={step !== "idle" || (!!local && !local.reviewSaved)}
                      />
                    </label>
                    <FieldMessage error={f.shown("email")} hint={step === "verified" ? "" : "One ₱100 voucher per email address. We’ll send a code to confirm it’s yours."} />

                    {step === "verified" ? (
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#1F5A2B]">
                        <span className="badge completed">✓ Email verified</span>
                        {!(local && !local.reviewSaved) && (
                          <button type="button" onClick={changeEmail} className="font-semibold underline underline-offset-4">Change</button>
                        )}
                      </p>
                    ) : step === "sent" ? (
                      <div className="mt-3 rounded-xl bg-earth-100 p-3">
                        <label className="opt-label" htmlFor="email-code">Verification code</label>
                        <div className="mt-2 flex gap-2">
                          <input
                            id="email-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="Code from your email"
                            className="input-box min-w-0 flex-1 tracking-[.3em]"
                          />
                          <button type="button" disabled={mailBusy || code.length < 6} onClick={confirmCode} className="btn-sm solid shrink-0 disabled:opacity-50">
                            {mailBusy ? "…" : "Verify"}
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                          <button type="button" disabled={cooldown > 0 || mailBusy} onClick={sendCode} className="font-semibold underline underline-offset-4 disabled:no-underline disabled:opacity-50">
                            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                          </button>
                          <button type="button" onClick={changeEmail} className="font-semibold underline underline-offset-4">Use a different email</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" disabled={mailBusy || !email.trim()} onClick={sendCode} className="btn-sm solid mt-3 disabled:opacity-50">
                        <Icon name="mail" size={14} /> {mailBusy ? "Sending…" : "Send verification code"}
                      </button>
                    )}
                    {mailMsg && (
                      <p role="status" className="mt-2 text-xs leading-5 text-earth-700">{mailMsg}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <p role="alert" className="mt-5 rounded-xl bg-[#F3DEDB] p-3 text-sm leading-5 text-[#8F3B31]">
                    {error}
                  </p>
                )}

                <button disabled={busy || step !== "verified"} className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  {busy ? "Sending…" : `Send review & get ₱${VOUCHER_AMOUNT} voucher`} <Icon name="arrow" size={17} />
                </button>
                <p className="mt-3 text-[11px] leading-4 text-earth-600">
                  Your email is only used to confirm it’s really you and to make sure each customer gets one voucher. You can use the voucher on any future order —
                  it’s optional at checkout.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

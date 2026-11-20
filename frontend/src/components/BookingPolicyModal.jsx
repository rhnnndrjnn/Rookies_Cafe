import { useEffect, useState } from "react"
import { Icon } from "./ui.jsx"
import { BOOKING_POLICIES, BUSINESS } from "../lib/constants.js"

/**
 * Booking policies & event guidelines.
 *  - mode="accept": must be accepted (tick the box, then Accept) before the customer can book.
 *  - mode="view": read-only, just a Close button.
 */
export default function BookingPolicyModal({ mode = "accept", policies = BOOKING_POLICIES, onAccept, onDecline, onClose }) {
  const [agreed, setAgreed] = useState(false)
  const accept = mode === "accept"

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e) => e.key === "Escape" && !accept && onClose?.()
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [accept, onClose])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-earth-950/70 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Booking policies and event guidelines"
    >
      <div className="modal-in flex max-h-[94svh] w-full flex-col overflow-hidden rounded-t-3xl bg-earth-50 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="shrink-0 bg-earth-900 px-6 py-6 text-earth-50 sm:px-8">
          <p className="eyebrow !text-earth-300">{BUSINESS.short} · Mobile coffee cart</p>
          <h2 className="display-title mt-1 text-3xl leading-tight">Booking policies &amp; event guidelines</h2>
          <p className="mt-2 text-xs leading-5 text-earth-300">
            Thank you for choosing {BUSINESS.short}! To ensure a smooth and enjoyable coffee cart experience, please
            review our booking policies before confirming your event.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          <div className="space-y-4">
            {policies.map((sec, i) => (
              <section key={sec.title} className="rounded-2xl border border-earth-300 bg-earth-100/60 p-4">
                <h3 className="text-sm font-bold uppercase tracking-[.08em]">
                  {i + 1}. {sec.title}
                </h3>
                <ul className="mt-2.5 space-y-1.5 text-sm leading-6 text-earth-700">
                  {sec.items.map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="mt-1 shrink-0 text-earth-700"><Icon name="check" size={14} /></span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-5 text-center text-sm font-semibold">Thank you for booking with us!</p>
        </div>

        <div className="shrink-0 space-y-3 border-t border-earth-300 bg-earth-50 px-5 py-4 sm:px-8">
          {accept ? (
            <>
              <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold leading-5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[#5A3A28]"
                />
                I have read and agree to the booking policies and event guidelines.
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="secondary-button" onClick={onDecline}>
                  Decline
                </button>
                <button
                  type="button"
                  disabled={!agreed}
                  onClick={onAccept}
                  className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="check" size={17} /> Accept &amp; continue
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              <button type="button" className="primary-button" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

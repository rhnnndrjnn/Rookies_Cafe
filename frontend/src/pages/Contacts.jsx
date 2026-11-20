import { useState } from "react"
import { FieldMessage, Icon, Input } from "../components/ui.jsx"
import { sendMessage } from "../lib/db.js"
import { useNotify } from "../lib/notify.jsx"
import { BUSINESS, mapDirectionsUrl, mapEmbedUrl, mapOpenUrl } from "../lib/constants.js"
import { rules, useLiveForm } from "../lib/validate.js"

const RULES = { name: rules.name, email: rules.email, message: rules.message }

export default function ContactsPage() {
  const [notice, setNotice] = useState("")
  const [sending, setSending] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const notify = useNotify()
  const f = useLiveForm({ name, email, message }, RULES)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setNotice("")
    f.touchAll()
    if (!f.valid) return
    setSending(true)
    try {
      await sendMessage({ name: name.trim(), email: email.trim(), message: message.trim() })
      setNotice("Thank you — your message is on its way to the Rookies Cafe team.")
      notify("Message sent", "The Rookies Cafe team will get back to you.", { tone: "success" })
      setName("")
      setEmail("")
      setMessage("")
      f.untouch()
    } catch {
      setNotice("Sorry, we couldn't send your message. Please try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="bg-earth-200">
      <section className="border-b border-earth-300 bg-earth-100 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="eyebrow">Visit or write to us</p>
          <h1 className="display-title mt-3 text-6xl tracking-[-.05em] sm:text-7xl">
            Contacts
          </h1>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-[2rem] border border-earth-300 shadow-xl lg:grid-cols-[.9fr_1.1fr]">
          <div className="flex flex-col justify-between bg-earth-900 p-7 text-earth-50 sm:p-12 lg:p-16">
            <div>
              <p className="eyebrow !text-earth-300">Rookies Cafe</p>
              <h2 className="display-title mt-4 text-4xl leading-tight sm:text-5xl">
                Come find your
                <br />
                <span className="italic text-earth-300">usual corner.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-earth-300">
                Whether it’s a quick pickup, a cozy afternoon, or a coffee cart
                for your next event, we’re ready to welcome you.
              </p>
            </div>

            <div className="mt-14 space-y-9">
              <div className="flex gap-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-earth-600">
                  <Icon name="pin" />
                </span>
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[.18em] text-earth-300">
                    Physical address
                  </p>
                  <address className="max-w-sm text-base not-italic leading-7">
                    {BUSINESS.address || "Teresa, Rizal, Philippines"}
                  </address>
                  <a href={mapOpenUrl()} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold underline underline-offset-4">
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-earth-50 p-7 sm:p-12 lg:p-16">
            <p className="eyebrow">Support & inquiries</p>
            <h2 className="display-title mt-3 text-4xl tracking-[-.03em]">
              Message Us
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-earth-600">
              Questions, feedback, or event coffee cart bookings? Send it our
              way, or find us on social media.
            </p>
            <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-7">
              <label className="field-label light">
                Name
                <Input
                  value={name}
                  onValue={setName}
                  onBlur={() => f.blur("name")}
                  error={f.shown("name")}
                  placeholder="Your full name"
                  maxLength={60}
                  className="contact-field light"
                />
                <FieldMessage error={f.shown("name")} />
              </label>
              <label className="field-label light">
                Email
                <Input
                  type="email"
                  value={email}
                  onValue={setEmail}
                  onBlur={() => f.blur("email")}
                  error={f.shown("email")}
                  placeholder="name@email.com"
                  className="contact-field light"
                />
                <FieldMessage error={f.shown("email")} />
              </label>
              <label className="field-label light">
                Message
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onBlur={() => f.blur("message")}
                  aria-invalid={f.shown("message") ? "true" : undefined}
                  rows={5}
                  maxLength={1000}
                  placeholder="Tell us what’s on your mind..."
                  className={`contact-field light resize-y ${f.shown("message") ? "input-error" : ""}`}
                />
                <FieldMessage error={f.shown("message")} />
              </label>
              <button
                disabled={sending}
                className="flex w-full items-center justify-between rounded-full bg-earth-700 px-6 py-4 text-xs font-bold uppercase tracking-[.12em] text-earth-50 transition hover:bg-earth-600 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send message"} <Icon name="arrow" />
              </button>
              {notice && (
                <p
                  role="status"
                  className="rounded-xl border border-earth-200 bg-earth-100 p-4 text-sm leading-6 text-earth-700"
                >
                  {notice}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[2rem] border border-earth-300 shadow-xl">
          <div className="map-frame" style={{ minHeight: 380 }}>
            <iframe
              title="Map to Rookies Cafe Teresa Rizal"
              src={mapEmbedUrl()}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a
              href={mapDirectionsUrl()}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-5 left-5 rounded-full bg-earth-700 px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] shadow-lg"
              style={{ color: "#F6F1EF" }}
            >
              Get directions
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

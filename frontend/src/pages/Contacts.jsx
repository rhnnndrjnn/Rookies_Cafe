import { useState } from "react"
import { FieldMessage, Icon, Input } from "../components/ui.jsx"
import { sendMessage } from "../lib/db.js"
import { useNotify } from "../lib/notify.jsx"
import { contactsMapQuery, mapDirectionsUrl, mapEmbedUrl, mapOpenUrl, resolveContacts } from "../lib/constants.js"
import { rules, useLiveForm } from "../lib/validate.js"

const RULES = { name: rules.name, email: rules.email, message: rules.message }

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex gap-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-earth-600">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="mb-2 text-[10px] uppercase tracking-[.18em] text-earth-300">{label}</p>
        {children}
      </div>
    </div>
  )
}

// The layout is fixed; every text, contact detail and link comes from the owner's Contacts-page
// settings (Owner dashboard → Contacts page). Phone, email and hours show once they are filled in.
export default function ContactsPage({ content }) {
  const c = resolveContacts(content)
  const mapQuery = contactsMapQuery(c)
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
          <p className="eyebrow">{c.eyebrow}</p>
          <h1 className="display-title mt-3 text-6xl tracking-[-.05em] sm:text-7xl">
            {c.title}
          </h1>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-[2rem] border border-earth-300 shadow-xl lg:grid-cols-[.9fr_1.1fr]">
          <div className="flex flex-col justify-between bg-earth-900 p-7 text-earth-50 sm:p-12 lg:p-16">
            <div>
              <p className="eyebrow !text-earth-300">{c.panelEyebrow}</p>
              <h2 className="display-title mt-4 text-4xl leading-tight sm:text-5xl">
                {c.headline1}
                <br />
                <span className="italic text-earth-300">{c.headline2}</span>
              </h2>
              {c.intro && <p className="mt-5 max-w-md whitespace-pre-line text-sm leading-7 text-earth-300">{c.intro}</p>}
            </div>

            <div className="mt-14 space-y-9">
              {c.address && (
                <InfoRow icon="pin" label={c.addressLabel}>
                  <address className="max-w-sm whitespace-pre-line text-base not-italic leading-7">{c.address}</address>
                  {c.mapLinkText && (
                    <a href={mapOpenUrl(mapQuery)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold underline underline-offset-4">
                      {c.mapLinkText}
                    </a>
                  )}
                </InfoRow>
              )}
              {c.phone && (
                <InfoRow icon="phone" label="Phone">
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-base leading-7 underline-offset-4 hover:underline">
                    {c.phone}
                  </a>
                </InfoRow>
              )}
              {c.email && (
                <InfoRow icon="mail" label="Email">
                  <a href={`mailto:${c.email}`} className="break-all text-base leading-7 underline-offset-4 hover:underline">
                    {c.email}
                  </a>
                </InfoRow>
              )}
              {c.hours && (
                <InfoRow icon="clock" label="Opening hours">
                  <p className="max-w-sm whitespace-pre-line text-base leading-7">{c.hours}</p>
                </InfoRow>
              )}
              {c.socials.length > 0 && (
                <div>
                  {c.socialsTitle && <p className="mb-3 text-[10px] uppercase tracking-[.18em] text-earth-300">{c.socialsTitle}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {c.socials.map((x) => (
                      <a key={x.label} href={x.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-earth-50">
                        {x.label}
                        {x.handle ? `: ${x.handle}` : ""}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-earth-50 p-7 sm:p-12 lg:p-16">
            <p className="eyebrow">{c.formEyebrow}</p>
            <h2 className="display-title mt-3 text-4xl tracking-[-.03em]">
              {c.formTitle}
            </h2>
            {c.formIntro && <p className="mt-3 max-w-md whitespace-pre-line text-sm leading-6 text-earth-600">{c.formIntro}</p>}
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
                {sending ? "Sending…" : c.sendButton} <Icon name="arrow" />
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
              title={`Map to ${c.panelEyebrow}`}
              src={mapEmbedUrl(mapQuery)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a
              href={mapDirectionsUrl(mapQuery)}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-5 left-5 rounded-full bg-earth-700 px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] shadow-lg"
              style={{ color: "#F6F1EF" }}
            >
              {c.directionsText}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

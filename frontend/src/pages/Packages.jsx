import { Icon, PageLink } from "../components/ui.jsx"
import { pesoWhole, resolveEvents } from "../lib/constants.js"

// Every text, price and list comes from the owner's Events-page settings
// (Owner dashboard → Events page). Anything left unset falls back to the default content.
export default function PackagesPage({ navigate, content }) {
  const e = resolveEvents(content)
  return (
    <main className="bg-earth-200">
      <section className="border-b border-earth-300 bg-earth-100 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="eyebrow">{e.eyebrow}</p>
          <h1 className="display-title mt-3 text-6xl tracking-[-.05em] sm:text-7xl">
            {e.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-earth-600">
            {e.tagline}
          </p>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] gap-5 md:grid-cols-3">
          {e.packages.map((pkg) => (
            <article key={pkg.name} className="overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-md">
              <div className="bg-earth-800 px-6 py-5 text-earth-50">
                <p className="display-title text-2xl uppercase tracking-wide">{pkg.name}</p>
                <p className="text-[10px] uppercase tracking-[.2em] text-earth-300">Package</p>
              </div>
              <div className="p-6">
                <p className="text-sm font-bold uppercase tracking-[.1em]">{pkg.guests} guests</p>
                <p className="display-title mt-2 text-4xl">{pesoWhole(pkg.price)}</p>
                <p className="mt-1 text-xs text-earth-600">
                  Cash offer: <strong className="text-earth-900">{pesoWhole(pkg.cash)}</strong>
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {[
                    `${pkg.guests} drinks (1 drink per guest)`,
                    `${pkg.classic} Classic flavors`,
                    `${pkg.premium} Premium flavors`,
                    e.service,
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Icon name="check" size={16} /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md sm:p-8">
            <p className="eyebrow">{e.inclusionsTitle}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {e.inclusions.map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="check" size={16} /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md sm:p-8">
            <p className="eyebrow">{e.flavorsTitle}</p>
            <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="opt-label">Classic flavors</p>
                <ul className="mt-2 space-y-1">{e.classicFlavors.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
              <div>
                <p className="opt-label">Premium flavors</p>
                <ul className="mt-2 space-y-1">{e.premiumFlavors.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md">
            <p className="eyebrow">{e.cashTitle}</p>
            <table className="data-table mt-3">
              <thead><tr><th>Package</th><th>Cash offer</th></tr></thead>
              <tbody>
                {e.packages.map((p) => (
                  <tr key={p.name}><td>{p.guests} Guests</td><td><strong>{pesoWhole(p.cash)}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md">
            <p className="eyebrow">{e.extraTitle}</p>
            <p className="mt-3 text-sm leading-6 text-earth-700">
              Additional Premium flavors on your menu may cost{" "}
              <strong>{pesoWhole(e.extraPremium)} each selection.</strong>
            </p>
            <p className="mt-3 text-sm leading-6 text-earth-700">
              Additional Classic flavors on your menu may cost{" "}
              <strong>{pesoWhole(e.extraClassic)} each selection.</strong>
            </p>
          </div>
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md">
            <p className="eyebrow">{e.paymentsTitle}</p>
            <p className="mt-3 text-sm">{e.payments.join(" · ")}</p>
            {e.paymentNote && <p className="mt-2 text-xs text-earth-600">{e.paymentNote}</p>}
            <p className="eyebrow mt-6">{e.occasionsTitle}</p>
            <p className="mt-3 text-sm">{e.occasions.join(" · ")}</p>
          </div>
        </div>
        <div className="mt-10 flex justify-center">
          <PageLink to="/book" navigate={navigate} className="primary-button">
            {e.bookButton} <Icon name="arrow" size={17} />
          </PageLink>
        </div>
      </section>
    </main>
  )
}

import { Icon, PageLink } from "../components/ui.jsx"
import {
  PACKAGES,
  PACKAGE_EXTRA_CLASSIC,
  PACKAGE_EXTRA_FLAVOR,
  PACKAGE_INCLUSIONS,
  PACKAGE_OCCASIONS,
  PACKAGE_PAYMENTS,
  PACKAGE_SERVICE,
  pesoWhole,
} from "../lib/constants.js"


// Flavor lists on the event poster: Classic = Classic + a few Premium/Non-espresso items.
const CLASSIC_FLAVORS = [
  "Americano", "Cappuccino", "Spanish Latte", "Cafe Mocha", "Vanilla Latte",
  "Hazelnut Latte", "Matcha Latte", "Strawberry", "Blueberry", "Cocoa",
]
const PREMIUM_FLAVORS = [
  "Sea Salt Latte", "Rookies Special", "Caramel Macchiato", "White Mocha", "Salted Caramel", "Biscoff Latte", "Dirty Matcha",
  "Strawberry Matcha", "White Chocolate Matcha", "Matcha Biscoff", "Blueberry Matcha",
]

export default function PackagesPage({ navigate }) {
  return (
    <main className="bg-earth-200">
      <section className="border-b border-earth-300 bg-earth-100 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="eyebrow">Event packages</p>
          <h1 className="display-title mt-3 text-6xl tracking-[-.05em] sm:text-7xl">
            Mobile Coffee Cart
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-earth-600">
            Good Coffee. Great Moments. Unforgettable Celebrations.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] gap-5 md:grid-cols-3">
          {PACKAGES.map((pkg) => (
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
                    PACKAGE_SERVICE,
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
            <p className="eyebrow">Package inclusions</p>
            <ul className="mt-4 space-y-2 text-sm">
              {PACKAGE_INCLUSIONS.map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="check" size={16} /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md sm:p-8">
            <p className="eyebrow">Choose your flavors from our menu</p>
            <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="opt-label">Classic flavors</p>
                <ul className="mt-2 space-y-1">{CLASSIC_FLAVORS.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
              <div>
                <p className="opt-label">Premium flavors</p>
                <ul className="mt-2 space-y-1">{PREMIUM_FLAVORS.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md">
            <p className="eyebrow">Exclusive cash payment offer</p>
            <table className="data-table mt-3">
              <thead><tr><th>Package</th><th>Cash offer</th></tr></thead>
              <tbody>
                {PACKAGES.map((p) => (
                  <tr key={p.name}><td>{p.guests} Guests</td><td><strong>{pesoWhole(p.cash)}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md">
            <p className="eyebrow">Additional flavor selection</p>
            <p className="mt-3 text-sm leading-6 text-earth-700">
              Additional premium flavors on your menu may cost{" "}
              <strong>{pesoWhole(PACKAGE_EXTRA_FLAVOR)} each selection.</strong>
            </p>
            <p className="mt-3 text-sm leading-6 text-earth-700">
              Additional Classic flavors on your menu may cost{" "}
              <strong>{pesoWhole(PACKAGE_EXTRA_CLASSIC)} each selection.</strong>
            </p>
          </div>
          <div className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-md">
            <p className="eyebrow">Accepted payment methods</p>
            <p className="mt-3 text-sm">{PACKAGE_PAYMENTS.join(" · ")}</p>
            <p className="mt-2 text-xs text-earth-600">Regular package rates apply to QRPh and card payments.</p>
            <p className="eyebrow mt-6">Perfect for every occasion</p>
            <p className="mt-3 text-sm">{PACKAGE_OCCASIONS.join(" · ")}</p>
          </div>
        </div>
        <div className="mt-10 flex justify-center">
          <PageLink to="/book" navigate={navigate} className="primary-button">
            Check dates &amp; book your event <Icon name="arrow" size={17} />
          </PageLink>
        </div>
      </section>
    </main>
  )
}

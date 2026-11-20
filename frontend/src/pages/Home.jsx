import { useRef } from "react"
import { Icon, PageLink } from "../components/ui.jsx"
import {
  contactsMapQuery,
  mapDirectionsUrl,
  mapEmbedUrl,
  pesoWhole,
  resolveContacts,
  resolveEvents,
  resolveHome,
} from "../lib/constants.js"

// The layout is fixed; every text, picture and favorite comes from the owner's Home-page settings
// (Owner dashboard → Home page). The map follows the address set under Contacts page.
export default function HomePage({ navigate, products, openProduct, events, content, contacts }) {
  const h = resolveHome(content)
  const c = resolveContacts(contacts)
  const mapQuery = contactsMapQuery(c)
  const startPkg = resolveEvents(events).packages[0]
  const carouselRef = useRef(null)
  const featured = h.favorites.map((n) => products.find((p) => p.name === n && p.available)).filter(Boolean)
  const hero = products.find((p) => p.name === h.heroProduct && p.available) || featured[0]

  const scrollCarousel = (direction) => {
    carouselRef.current?.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    })
  }

  return (
    <main>
      <section className="home-hero grid min-h-[calc(100svh-102px)] lg:min-h-[calc(100svh-151px)] lg:grid-cols-[54%_46%]">
        <div className="flex flex-col justify-between bg-earth-100 px-6 py-12 sm:px-10 lg:px-16 lg:py-16 xl:px-20">
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-earth-700" /> {h.eyebrow}
          </p>
          <div className="my-14 max-w-[720px]">
            <h1 className="display-title text-[clamp(4rem,8.2vw,8rem)] leading-[.84] tracking-[-.065em]">
              {h.headline1}
              <br />
              <span className="italic text-earth-700">{h.headline2}</span>
              <br />
              {h.headline3}
            </h1>
            {h.intro && <p className="mt-8 max-w-lg whitespace-pre-line text-base leading-7 text-earth-600">{h.intro}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {h.primaryButton && (
                <PageLink to="/menu" navigate={navigate} className="primary-button">
                  {h.primaryButton} <Icon name="arrow" size={17} />
                </PageLink>
              )}
              {h.secondaryButton && (
                <PageLink to="/about" navigate={navigate} className="secondary-button">
                  {h.secondaryButton}
                </PageLink>
              )}
            </div>
          </div>
          <div className="flex max-w-lg items-center justify-between border-t border-earth-200 pt-5 text-[10px] uppercase tracking-[.15em] text-earth-600">
            <span>{h.stripLeft}</span>
            <span>{h.stripRight}</span>
          </div>
        </div>
        <div className="relative h-full min-h-[580px] overflow-hidden">
          {h.heroImage && (
            <img
              src={h.heroImage}
              alt={h.heroAlt}
              className="absolute inset-0 h-full w-full object-cover object-center scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-earth-950/60 via-transparent to-earth-900/10" />
          <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between text-earth-50 sm:bottom-10 sm:left-10 sm:right-10">
            <div>
              {h.heroBadge && (
                <p className="text-[9px] font-bold uppercase tracking-[.2em] text-earth-200">
                  {h.heroBadge}
                </p>
              )}
              <p className="display-title mt-2 text-3xl">{hero?.name || h.heroProduct}</p>
            </div>
            {hero && (
              <button
                onClick={() => openProduct(hero)}
                className="grid size-12 place-items-center rounded-full bg-earth-700 text-earth-50 shadow-lg ring-4 ring-earth-50/80 transition hover:scale-110 hover:bg-earth-600 active:scale-95"
                aria-label={`Add ${hero.name} to cart`}
              >
                <Icon name="plus" size={22} />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-earth-300 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1344px]">
          <div className="mb-9 flex items-end justify-between gap-5">
            <div>
              <p className="eyebrow">{h.favEyebrow}</p>
              <h2 className="display-title mt-3 text-5xl tracking-[-.04em] sm:text-6xl">
                {h.favTitle}
              </h2>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button
                onClick={() => scrollCarousel(-1)}
                className="carousel-button rotate-180"
                aria-label="Previous products"
              >
                <Icon name="arrow" />
              </button>
              <button
                onClick={() => scrollCarousel(1)}
                className="carousel-button"
                aria-label="Next products"
              >
                <Icon name="arrow" />
              </button>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="no-scrollbar flex snap-x gap-4 overflow-x-auto"
          >
            {featured.map((item) => (
              <article
                key={item.id}
                className="group min-w-[82vw] snap-start overflow-hidden rounded-2xl border border-earth-300 bg-earth-50 shadow-md sm:min-w-[330px] lg:min-w-[calc(25%-12px)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-earth-200">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 p-5">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="mt-1 text-xs text-earth-600">
                      From ₱{Number(item.price).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => openProduct(item)}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-earth-700 text-earth-50 shadow-md transition hover:scale-110 hover:bg-earth-600 active:scale-95"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    <Icon name="plus" size={20} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {h.favButton && (
            <div className="mt-9 flex justify-center">
              <PageLink to="/menu" navigate={navigate} className="primary-button">
                {h.favButton} <Icon name="arrow" size={17} />
              </PageLink>
            </div>
          )}
        </div>
      </section>

      <section className="bg-earth-100 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-[2rem] border border-earth-300 shadow-xl lg:grid-cols-2">
          <div className="flex flex-col justify-center bg-earth-900 p-8 text-earth-50 sm:p-12 lg:p-16">
            <p className="eyebrow !text-earth-300">{h.eventEyebrow}</p>
            <h2 className="display-title mt-4 text-4xl leading-tight sm:text-5xl">
              {h.eventTitle1}
              <br />
              <span className="italic text-earth-300">{h.eventTitle2}</span>
            </h2>
            <p className="mt-6 max-w-md whitespace-pre-line text-sm leading-7 text-earth-300">
              {h.eventText}
              {h.showPackagePrice && startPkg && ` Packages start at ${pesoWhole(startPkg.price)} for ${startPkg.guests} guests.`}
            </p>
            {h.eventLink && (
              <PageLink
                to="/packages"
                navigate={navigate}
                className="mt-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[.14em]"
              >
                {h.eventLink} <Icon name="arrow" />
              </PageLink>
            )}
          </div>
          <div className="map-frame">
            <iframe
              title={`Map to ${h.eyebrow}`}
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

import { Icon, PageLink } from "../components/ui.jsx"
import { resolveAbout } from "../lib/constants.js"

// The layout is fixed; every text and picture comes from the owner's About-page settings
// (Owner dashboard → About page). Anything left blank falls back to the default content.
export default function AboutPage({ navigate, content }) {
  const a = resolveAbout(content)
  return (
    <main>
      <section className="grid min-h-[650px] lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-earth-900 px-6 py-20 text-earth-50 sm:px-10 lg:px-16 xl:px-20">
          <p className="eyebrow !text-earth-300">{a.eyebrow}</p>
          <h1 className="display-title mt-5 text-[clamp(3.7rem,7vw,7rem)] leading-[.9] tracking-[-.055em]">
            {a.headline1}
            <br />
            <span className="italic text-earth-300">{a.headline2}</span>
          </h1>
          <p className="mt-8 max-w-lg whitespace-pre-line text-base leading-7 text-earth-300">
            {a.intro}
            {a.closing && (
              <>
                {"\n\n"}
                {a.closing}
              </>
            )}
          </p>
        </div>
        <div className="h-full min-h-[520px] overflow-hidden bg-earth-200">
          {a.heroImage && <img src={a.heroImage} alt={a.heroAlt} className="h-full w-full object-cover object-center" />}
        </div>
      </section>

      <section className="bg-earth-100 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="eyebrow">{a.whyEyebrow}</p>
            <h2 className="display-title mt-4 text-5xl leading-[1.02] tracking-[-.04em]">
              {a.whyTitle1}
              <br />
              {a.whyTitle2}
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {a.values.map((value, i) => (
              <article key={i} className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-sm">
                <span className="text-[10px] font-bold text-earth-600">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 text-lg font-semibold">{value.title}</h3>
                <p className="mt-3 text-sm leading-7 text-earth-600">{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-earth-300 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1344px]">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">{a.galleryEyebrow}</p>
            <h2 className="display-title mt-4 text-5xl tracking-[-.04em] sm:text-6xl">{a.galleryTitle}</h2>
          </div>
          <div className="gallery-grid">
            {a.gallery.map((g, i) => (
              <figure key={i} className={i === 0 ? "gallery-tall" : i === 3 ? "gallery-wide" : undefined}>
                {g.src && <img src={g.src} alt={g.alt} />}
              </figure>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <PageLink to="/menu" navigate={navigate} className="primary-button">
              {a.menuButton} <Icon name="arrow" />
            </PageLink>
          </div>
        </div>
      </section>
    </main>
  )
}

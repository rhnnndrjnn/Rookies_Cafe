import { Icon, PageLink } from "../components/ui.jsx"
import { BUSINESS, image } from "../lib/constants.js"

export default function AboutPage({ navigate }) {
  return (
    <main>
      <section className="grid min-h-[650px] lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-earth-900 px-6 py-20 text-earth-50 sm:px-10 lg:px-16 xl:px-20">
          <p className="eyebrow !text-earth-300">Rookies Cafe</p>
          <h1 className="display-title mt-5 text-[clamp(3.7rem,7vw,7rem)] leading-[.9] tracking-[-.055em]">
            Good coffee.
            <br />
            <span className="italic text-earth-300">Great moments.</span>
          </h1>
          <p className="mt-8 max-w-lg text-base leading-7 text-earth-300">
            {BUSINESS.subTagline} From classic espresso favorites to matcha,
            non-coffee treats, and cheesy snacks, everything at Rookies Cafe is
            made fresh for the moments worth sharing.
            <br /> <br />
            Rookies Cafe — Good Coffee. Great Moments.
          </p>
        </div>
        <div className="h-full min-h-[520px] overflow-hidden">
  <img
    src="https://lugwbevxkxmkhrqzpdox.supabase.co/storage/v1/object/public/menu-images/mommm.jpg"
    alt="Warm interior of Rookies Cafe"
    className="h-full w-full object-cover object-center"
  />
</div>
      </section>

      <section className="bg-earth-100 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="eyebrow">Why we brew</p>
            <h2 className="display-title mt-4 text-5xl leading-[1.02] tracking-[-.04em]">
              Everyday care,
              <br />
              cup by cup.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              {
                number: "01",
                title: "Arabica blend",
                text: "Every espresso drink is pulled from our Arabica blend coffee beans, chosen for a smooth, balanced cup.",
              },
              {
                number: "02",
                title: "Made with intention",
                text: "Every drink is freshly prepared and finished by hand—with premium syrups, sauces, and ingredients.",
              },
              {
                number: "03",
                title: "Made for every craving",
                text: "Espresso, matcha, cocoa, fruity favorites, and snacks—there is something for every coffee craving.",
              },
              {
                number: "04",
                title: "Coffee on the go",
                text: "Our mobile coffee cart brings a professional barista and the full menu to weddings, birthdays, and corporate events.",
              },
            ].map((value) => (
              <article
                key={value.number}
                className="rounded-2xl border border-earth-300 bg-earth-50 p-6 shadow-sm"
              >
                <span className="text-[10px] font-bold text-earth-600">
                  {value.number}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{value.title}</h3>
                <p className="mt-3 text-sm leading-7 text-earth-600">
                  {value.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-earth-300 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
  <div className="mx-auto max-w-[1344px]">
    <div className="mb-10 max-w-2xl">
      <p className="eyebrow">Inside Rookies Cafe</p>
      <h2 className="display-title mt-4 text-5xl tracking-[-.04em] sm:text-6xl">
        The cafe, in moments.
      </h2>
    </div>
    <div className="gallery-grid">
      <figure className="gallery-tall">
        <img
          src="https://lugwbevxkxmkhrqzpdox.supabase.co/storage/v1/object/public/menu-images/mom4.jpg"
          alt="A carefully poured cup of coffee"
        />
      </figure>
      <figure>
        <img
          src="https://lugwbevxkxmkhrqzpdox.supabase.co/storage/v1/object/public/menu-images/mom.jpg"
          alt="Fresh pastries at the café counter"
        />
      </figure>
      <figure>
        <img
          src="https://lugwbevxkxmkhrqzpdox.supabase.co/storage/v1/object/public/menu-images/mom1.jpg"
          alt="Coffee and pastry ready to share"
        />
      </figure>
      <figure className="gallery-wide">
        <img
          src="https://lugwbevxkxmkhrqzpdox.supabase.co/storage/v1/object/public/menu-images/mom2.jpg"
          alt="Warm details inside a rustic coffee shop"
        />
      </figure>
    </div>
    <div className="mt-12 flex justify-center">
      <PageLink to="/menu" navigate={navigate} className="primary-button">
        Taste the menu <Icon name="arrow" />
      </PageLink>
    </div>
  </div>
</section>
    </main>
  )
}

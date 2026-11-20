import { FieldMessage, Input } from "./ui.jsx"
import { CITIES, REGIONS, TERESA_BARANGAYS, TERESA_ZIP, isTeresa, needsLalamove } from "../lib/phAddress.js"

/**
 * Philippine delivery address: region → province → city / municipality → barangay → street.
 * `a` is the address object, `set(patch)` merges changes, `f` is the useLiveForm helper.
 */
export default function AddressFields({ a, set, f, mode = "delivery" }) {
  const region = REGIONS.find((r) => r.name === a.region) || REGIONS[0]
  const cities = CITIES[a.province]
  const teresa = isTeresa(a.province, a.city)
  const outside = needsLalamove(a.province, a.city)
  const isEvent = mode === "event"

  const changeRegion = (name) => {
    const r = REGIONS.find((x) => x.name === name)
    set({ region: name, province: r.provinces.length === 1 ? r.provinces[0] : "", city: "", barangay: "" })
  }
  const changeProvince = (province) => set({ province, city: "", barangay: "" })
  const changeCity = (city) =>
    set({ city, barangay: "", zip: isTeresa(a.province, city) ? TERESA_ZIP : a.zip === TERESA_ZIP ? "" : a.zip })

  return (
    <fieldset className="mt-5 space-y-5">
      <legend className="opt-label">{isEvent ? "Event place (Philippines)" : "Delivery address (Philippines)"}</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="opt-label">Region</span>
          <select value={a.region} onChange={(e) => changeRegion(e.target.value)} className="input-box mt-2" autoComplete="address-level1">
            {REGIONS.map((r) => (
              <option key={r.name}>{r.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="opt-label">Province</span>
          <select
            value={a.province}
            onChange={(e) => changeProvince(e.target.value)}
            onBlur={() => f.blur("province")}
            className={`input-box mt-2 ${f.shown("province") ? "input-error" : ""}`}
          >
            <option value="">Select province…</option>
            {region.provinces.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <FieldMessage error={f.shown("province")} />
        </label>
        <label className="block">
          <span className="opt-label">{a.province === "Metro Manila" ? "City" : "City / Municipality"}</span>
          {cities ? (
            <select
              value={a.city}
              onChange={(e) => changeCity(e.target.value)}
              onBlur={() => f.blur("city")}
              className={`input-box mt-2 ${f.shown("city") ? "input-error" : ""}`}
            >
              <option value="">Select city / municipality…</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          ) : (
            <Input
              value={a.city}
              onValue={(v) => changeCity(v)}
              onBlur={() => f.blur("city")}
              error={f.shown("city")}
              placeholder={a.province ? "Type your city or municipality" : "Choose a province first"}
              maxLength={60}
              autoComplete="address-level2"
              className="input-box mt-2"
            />
          )}
          <FieldMessage error={f.shown("city")} />
        </label>
        <label className="block">
          <span className="opt-label">Barangay</span>
          {teresa ? (
            <select
              value={a.barangay}
              onChange={(e) => set({ barangay: e.target.value })}
              onBlur={() => f.blur("barangay")}
              className={`input-box mt-2 ${f.shown("barangay") ? "input-error" : ""}`}
            >
              <option value="">Select barangay…</option>
              {TERESA_BARANGAYS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          ) : (
            <Input
              value={a.barangay}
              onValue={(v) => set({ barangay: v })}
              onBlur={() => f.blur("barangay")}
              error={f.shown("barangay")}
              placeholder="e.g. San Gabriel"
              maxLength={60}
              className="input-box mt-2"
            />
          )}
          <FieldMessage error={f.shown("barangay")} />
        </label>
      </div>

      {!isEvent && teresa && (
        <p role="note" className="rounded-xl border border-[#B9D8BE] bg-[#EAF5EC] p-4 text-sm leading-6 text-[#1F5A2B]">
          <strong>We deliver within Teresa.</strong> Place your order and we’ll confirm the details with you on Messenger.
        </p>
      )}
      {!isEvent && outside && (
        <p role="note" className="rounded-xl border border-[#E4CC87] bg-[#F8EBC6] p-4 text-sm leading-6 text-[#6B5311]">
          <strong>Lalamove will be needed for this address.</strong> Deliveries outside Teresa go through a
          Lalamove rider, and other charges may apply. We’ll confirm the fare with you on Messenger.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-[1fr_130px]">
        <label className="block">
          <span className="opt-label">{isEvent ? "Building / house no. and street" : "House / unit no. and street"}</span>
          <Input
            value={a.street}
            onValue={(v) => set({ street: v })}
            onBlur={() => f.blur("street")}
            error={f.shown("street")}
            placeholder="e.g. 12 Mabini St., Villa Subdivision"
            maxLength={120}
            autoComplete="address-line1"
            className="input-box mt-2"
          />
          <FieldMessage error={f.shown("street")} />
        </label>
        <label className="block">
          <span className="opt-label">ZIP (optional)</span>
          <Input
            kind="digits"
            value={a.zip}
            onValue={(v) => set({ zip: v.slice(0, 4) })}
            placeholder="1880"
            maxLength={4}
            autoComplete="postal-code"
            className="input-box mt-2"
          />
        </label>
      </div>
      <label className="block">
        <span className="opt-label">Subdivision / village / building (optional)</span>
        <Input
          value={a.subdivision || ""}
          onValue={(v) => set({ subdivision: v })}
          placeholder="e.g. Villa Teresa Subdivision, Phase 2"
          maxLength={80}
          className="input-box mt-2"
        />
      </label>
      <label className="block">
        <span className="opt-label">{isEvent ? "Landmark / how to find the place (optional)" : "Landmark / delivery notes (optional)"}</span>
        <Input
          value={a.landmark}
          onValue={(v) => set({ landmark: v })}
          placeholder="e.g. Beside the barangay hall, blue gate"
          maxLength={120}
          className="input-box mt-2"
        />
      </label>
    </fieldset>
  )
}

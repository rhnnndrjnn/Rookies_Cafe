import { useRef, useState } from "react"

/**
 * Clock-face time picker (hour dial -> minute dial, AM/PM toggle). Works with touch and mouse;
 * Times earlier than the minimum lead time are unavailable. Earlier clock times
 * roll over to the next day, so the dial remains usable across midnight.
 *   value: Date   onChange: (Date) => void   min: Date
 */
const STEP = 5
const MINUTES = Array.from({ length: 60 / STEP }, (_, i) => i * STEP)
const C = 130 // dial centre (viewBox is 260 x 260)
const LABEL_R = 92
const polar = (deg, r) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)]
const pad = (n) => String(n).padStart(2, "0")

export default function ClockPicker({ value, onChange, min }) {
  const [mode, setMode] = useState("hour")
  const svgRef = useRef(null)
  const dragging = useRef(false)

  const h24 = value.getHours()
  const pm = h24 >= 12
  const h12 = h24 % 12 || 12
  const minute = value.getMinutes()

  const make = (h, m, isPm) => {
    const d = new Date(min)
    d.setHours((h % 12) + (isPm ? 12 : 0), m, 0, 0)
    // A clock time earlier than the minimum means the following calendar day.
    if (d < min) d.setDate(d.getDate() + 1)
    return d
  }
  const ok = (d) => d >= min
  const hourOk = (h) => MINUTES.some((m) => ok(make(h, m, pm)))
  const minuteOk = (m) => ok(make(h12, m, pm))
  const periodOk = (isPm) =>
    Array.from({ length: 12 }, (_, i) => i + 1).some((h) => MINUTES.some((m) => ok(make(h, m, isPm))))

  const pickHour = (h) => {
    if (!hourOk(h)) return
    const m = minuteOk(minute) && ok(make(h, minute, pm)) ? minute : MINUTES.find((x) => ok(make(h, x, pm)))
    onChange(make(h, m, pm))
  }
  const pickMinute = (m) => {
    if (minuteOk(m)) onChange(make(h12, m, pm))
  }
  const pickPeriod = (isPm) => {
    if (isPm === pm || !periodOk(isPm)) return
    if (ok(make(h12, minute, isPm))) return onChange(make(h12, minute, isPm))
    for (let h = 1; h <= 12; h++) {
      const m = MINUTES.find((x) => ok(make(h, x, isPm)))
      if (m !== undefined) return onChange(make(h, m, isPm))
    }
  }

  const fromPointer = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    const deg = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
    if (mode === "hour") pickHour(Math.round(deg / 30) % 12 || 12)
    else pickMinute((Math.round(deg / (STEP * 6)) * STEP) % 60)
  }
  const down = (e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    fromPointer(e)
  }
  const move = (e) => dragging.current && fromPointer(e)
  const up = () => {
    if (!dragging.current) return
    dragging.current = false
    if (mode === "hour") setMode("minute")
  }

  const handDeg = mode === "hour" ? (h12 % 12) * 30 : minute * 6
  const [hx, hy] = polar(handDeg, LABEL_R)
  const items = mode === "hour" ? Array.from({ length: 12 }, (_, i) => i + 1) : MINUTES
  const selected = mode === "hour" ? h12 : minute

  const segment = (active) =>
    `rounded-lg px-2 py-1 font-['Fraunces'] text-3xl leading-none transition ${
      active ? "bg-earth-700 text-earth-50" : "bg-earth-100 text-earth-900 hover:bg-earth-200"
    }`

  return (
    <div className="mx-auto w-full max-w-[210px] select-none">
      <div className="flex items-center justify-center gap-2" aria-live="polite">
        <button type="button" className={segment(mode === "hour")} onClick={() => setMode("hour")} aria-label={`Hour ${h12}. Change hour`}>
          {pad(h12)}
        </button>
        <span className="font-['Fraunces'] text-2xl">:</span>
        <button type="button" className={segment(mode === "minute")} onClick={() => setMode("minute")} aria-label={`Minute ${minute}. Change minutes`}>
          {pad(minute)}
        </button>
        <div className="ml-1 flex flex-col overflow-hidden rounded-lg border border-earth-300 text-[10px] font-bold">
          {[false, true].map((isPm) => (
            <button
              type="button"
              key={isPm ? "pm" : "am"}
              disabled={!periodOk(isPm)}
              aria-pressed={pm === isPm}
              onClick={() => pickPeriod(isPm)}
              className={`px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-30 ${
                pm === isPm ? "bg-earth-700 text-earth-50" : "hover:bg-earth-100"
              }`}
            >
              {isPm ? "PM" : "AM"}
            </button>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 260 260"
        role="group"
        aria-label={mode === "hour" ? "Choose the hour" : "Choose the minutes"}
        className="mt-3 aspect-square w-full touch-none cursor-pointer"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <circle cx={C} cy={C} r="124" fill="var(--earth-100)" stroke="var(--earth-300)" />
        <line x1={C} y1={C} x2={hx} y2={hy} stroke="var(--earth-700)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={C} cy={C} r="4.5" fill="var(--earth-700)" />
        <circle cx={hx} cy={hy} r="19" fill="var(--earth-700)" />
        {items.map((n) => {
          const deg = (mode === "hour" ? n % 12 : n / STEP) * 30
          const [x, y] = polar(deg, LABEL_R)
          const enabled = mode === "hour" ? hourOk(n) : minuteOk(n)
          const active = n === selected
          return (
            <text
              key={n}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="16"
              fontWeight="600"
              fill={active ? "var(--earth-50)" : enabled ? "var(--earth-900)" : "var(--earth-300)"}
              style={{ pointerEvents: "none" }}
             
            >
              {mode === "hour" ? n : pad(n)}
            </text>
          )
        })}
      </svg>
      <p className="mt-1 text-center text-[10px] leading-4 text-earth-600">
        {mode === "hour" ? "Tap or drag to pick the hour" : "Now pick the minutes"} · times before the 5-minute lead time aren’t available
      </p>
    </div>
  )
}

const STICKER_STYLES = {
  New: "bg-[#F7E8D8]/90 text-[#80543A] ring-[#D9B99B]/70",
  "Best Seller": "bg-[#EAD9A8]/90 text-[#76551B] ring-[#D5BD7C]/70",
  "Must Try": "bg-[#DCE6D7]/90 text-[#496347] ring-[#B7C9B0]/70",
  "For Sharing": "bg-[#E8DED2]/90 text-[#725B49] ring-[#CDBBA8]/70",
}

export default function ProductSticker({ label, className = "" }) {
  if (!label) return null

  return (
    <span
      aria-label={label}
      className={`pointer-events-none absolute right-1.5 top-1.5 z-10 inline-flex max-w-[70%] items-center rounded-full px-1.5 py-[3px] text-[6px] font-bold uppercase leading-none tracking-[.08em] ring-1 ring-inset backdrop-blur-[2px] sm:right-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[7px] ${STICKER_STYLES[label] || "bg-[#F2E9DF]/90 text-[#725B49] ring-[#CDBBA8]/70"} ${className}`}
    >
      {label}
    </span>
  )
}

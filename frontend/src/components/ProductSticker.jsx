const STICKER_STYLES = {
  New: "bg-[#A83D2D] text-white",
  "Best Seller": "bg-[#D6A33A] text-[#2B1A12]",
  "Must Try": "bg-[#496C53] text-white",
  "For Sharing": "bg-[#5B557D] text-white",
}

export default function ProductSticker({ label, className = "" }) {
  if (!label) return null
  return (
    <span className={`pointer-events-none absolute right-2 top-2 z-10 inline-flex max-w-[85%] -rotate-2 items-center rounded-sm px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] shadow-md ring-1 ring-white/50 sm:right-3 sm:top-3 sm:text-[9px] ${STICKER_STYLES[label] || "bg-earth-700 text-white"} ${className}`}>
      {label}
    </span>
  )
}

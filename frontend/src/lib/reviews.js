// Customer reviews are saved as rows in the existing `messages` table (anyone may insert, only staff
// may read), tagged so the Owner dashboard can show them under "Reviews" instead of "Messages".
export const REVIEW_PREFIX = "REVIEW::"

export const RATING_FIELDS = [
  { id: "overall", label: "Overall experience", hint: "How was your visit as a whole?" },
  { id: "service", label: "Service & staff", hint: "Friendliness and helpfulness of our team" },
  { id: "food", label: "Drinks & food quality", hint: "Taste, freshness and presentation" },
  { id: "ambiance", label: "Ambiance & cleanliness", hint: "Comfort, cleanliness and vibe" },
  { id: "value", label: "Value for money", hint: "Was it worth the price?" },
]

export const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"]

export const encodeReview = ({ ratings, comment, voucher }) =>
  REVIEW_PREFIX + JSON.stringify({ v: 1, ratings, comment: comment || "", voucher: voucher || null })

export const isReview = (m) => String(m?.message || "").startsWith(REVIEW_PREFIX)

/** Parsed review fields, or null when the message isn't a (valid) review. */
export function parseReview(m) {
  if (!isReview(m)) return null
  try {
    const data = JSON.parse(m.message.slice(REVIEW_PREFIX.length))
    return { ratings: data.ratings || {}, comment: data.comment || "", voucher: data.voucher || null }
  } catch {
    return null
  }
}

export const averageRating = (reviews, field) => {
  const vals = reviews.map((r) => Number(r.parsed.ratings?.[field])).filter((n) => n >= 1 && n <= 5)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

/** "Maria Dela Cruz" -> "Maria D." — the public page never shows a full name. */
export const publicName = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "Customer"
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]
}

/**
 * What the public Feedback page shows: { count, averages, distribution, reviews } built ONLY from
 * reviews the owner switched on (`show_public`). Same shape as the `review_summary()` database
 * function (supabase/migration_v11.sql), so demo mode and the real database render identically.
 * Contains no emails or voucher codes.
 */
export function summarizeReviews(messages) {
  const reviews = (messages || [])
    .filter((m) => m.show_public)
    .map((m) => ({ ...m, parsed: parseReview(m) }))
    .filter((r) => r.parsed)
  const averages = Object.fromEntries(RATING_FIELDS.map((f) => [f.id, averageRating(reviews, f.id)]))
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach((r) => {
    const n = Math.round(Number(r.parsed.ratings?.overall))
    if (n >= 1 && n <= 5) distribution[n] += 1
  })
  const items = reviews
    .filter((r) => r.parsed.comment.trim() && Number(r.parsed.ratings?.overall) >= 1)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 30)
    .map((r) => ({
      name: publicName(r.name),
      overall: Number(r.parsed.ratings.overall),
      comment: r.parsed.comment.trim().slice(0, 500),
      created_at: r.created_at,
    }))
  return { count: reviews.length, averages, distribution, reviews: items }
}

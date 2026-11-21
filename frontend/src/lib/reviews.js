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

/**
 * Aggregate numbers for the public Feedback page: { count, averages, distribution }.
 * Same shape as the `review_summary()` database function (supabase/migration_v10.sql), so demo
 * mode and the real database render identically. Contains no personal data.
 */
export function summarizeReviews(messages) {
  const reviews = (messages || []).map((m) => ({ parsed: parseReview(m) })).filter((r) => r.parsed)
  const averages = Object.fromEntries(RATING_FIELDS.map((f) => [f.id, averageRating(reviews, f.id)]))
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach((r) => {
    const n = Math.round(Number(r.parsed.ratings?.overall))
    if (n >= 1 && n <= 5) distribution[n] += 1
  })
  return { count: reviews.length, averages, distribution }
}

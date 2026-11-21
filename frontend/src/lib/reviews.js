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

const DAY = 24 * 60 * 60 * 1000

/**
 * Smart suggestions without any paid AI: a transparent score from
 *  - the event being looked at (same category, similar price),
 *  - the user's own paid bookings (favourite categories, usual budget),
 *  - how fast an event is filling up, and how soon it happens.
 * Pure function, so it is easy to test and tune.
 */
export function rankEvents({ events, context = null, history = [], city = null, now = new Date(), limit = 3 }) {
  const bookedIds = new Set(history.map((h) => String(h.eventId)))

  const categoryCount = {}
  let priceSum = 0
  let priceN = 0
  for (const h of history) {
    categoryCount[h.category] = (categoryCount[h.category] || 0) + 1
    if (h.price > 0) {
      priceSum += h.price
      priceN += 1
    }
  }
  const maxCategory = Math.max(0, ...Object.values(categoryCount))

  const refPrice =
    context && context.pricePerSeat > 0 ? context.pricePerSeat : priceN ? priceSum / priceN : 0

  const scored = []

  for (const e of events) {
    const id = String(e._id)
    if (bookedIds.has(id)) continue
    if (context && String(context._id) === id) continue
    if (!(e.availableSeats > 0)) continue

    let score = 0
    let reason = null

    // Shows in the visitor's city come first (they can actually go).
    const wantedCity = (city || context?.city || '').toLowerCase()
    if (wantedCity && (e.city || '').toLowerCase() === wantedCity) score += 15

    if (context && e.category === context.category) {
      score += 40
      reason = `Similar to ${context.title}`
    }

    const affinity = maxCategory ? (categoryCount[e.category] || 0) / maxCategory : 0
    if (affinity > 0) {
      score += 30 * affinity
      reason = reason || `Because you booked ${e.category}`
    }

    if (refPrice > 0 && e.pricePerSeat > 0) {
      const closeness = Math.max(0, 1 - Math.abs(e.pricePerSeat - refPrice) / refPrice)
      score += 20 * closeness
      if (!reason && closeness >= 0.7) reason = 'Fits your budget'
    }

    const fill = e.totalSeats > 0 ? 1 - e.availableSeats / e.totalSeats : 0
    const left = e.totalSeats > 0 ? e.availableSeats / e.totalSeats : 1
    score += 20 * fill

    const days = e.date ? (new Date(e.date).getTime() - now.getTime()) / DAY : null
    if (days !== null && days >= 0 && days <= 14) {
      score += 10
      if (!reason) reason = 'Happening soon'
    }

    scored.push({
      event: e,
      score,
      reason: reason || 'Popular right now',
      badge: left <= 0.2 || fill >= 0.6 ? 'Selling fast' : null
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

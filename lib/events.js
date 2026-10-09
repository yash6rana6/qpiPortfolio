/** 'live' | 'upcoming' | 'past' — live = started and not yet ended (endDate, else end of that day). */
export function eventPhase(event, now = Date.now()) {
  if (!event?.date) return 'upcoming'
  const start = new Date(event.date).getTime()
  if (Number.isNaN(start)) return 'upcoming'
  if (start > now) return 'upcoming'

  let end
  if (event.endDate) {
    end = new Date(event.endDate).getTime()
  } else {
    const d = new Date(start)
    d.setHours(23, 59, 59, 999)
    end = d.getTime()
  }
  return now <= end ? 'live' : 'past'
}

export const normalizeCity = (c) => String(c || '').trim().toLowerCase()

/** Unique city names (display casing of first occurrence), sorted. */
export function citiesOf(events) {
  const seen = new Map()
  for (const e of events) {
    const key = normalizeCity(e.city)
    if (key && !seen.has(key)) seen.set(key, String(e.city).trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export function matchesSearch(event, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [event.title, event.venue, event.city, event.category].some((v) => String(v || '').toLowerCase().includes(q))
}

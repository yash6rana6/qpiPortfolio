'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const union = (set, items) => new Set([...set, ...items])
const minus = (set, items) => {
  const next = new Set(set)
  items.forEach((i) => next.delete(i))
  return next
}

/**
 * Live seat state for one show.
 *  - REST snapshot on open + every 5s (covers silently expiring holds)
 *  - Server-Sent Events for instant hold / release / book pushes
 * `flash` = seats that just changed, used to pulse them for ~1s.
 */
export function useSeatLive(eventId) {
  const [layout, setLayout] = useState(null)
  const [booked, setBooked] = useState(() => new Set())
  const [held, setHeld] = useState(() => new Set())
  const [flash, setFlash] = useState(() => new Set())
  const [live, setLive] = useState(false)
  const [error, setError] = useState('')
  const flashTimer = useRef(null)

  const pulse = useCallback((seats) => {
    setFlash((prev) => union(prev, seats))
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(new Set()), 900)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}/seats`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load seats')

      setLayout({
        title: data.title,
        venue: data.venue,
        city: data.city,
        date: data.date,
        pricePerSeat: data.pricePerSeat,
        rows: data.rows,
        seatsPerRow: data.seatsPerRow,
        degraded: data.degraded
      })
      setBooked(new Set(data.booked))
      setHeld(new Set(data.held))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [eventId])

  useEffect(() => {
    refresh()
    const poll = setInterval(() => {
      if (!document.hidden) refresh()
    }, 5000)
    return () => clearInterval(poll)
  }, [refresh])

  useEffect(() => {
    const source = new EventSource(`/api/v1/events/${eventId}/stream`)
    source.onopen = () => setLive(true)
    source.onerror = () => setLive(false)
    source.onmessage = (m) => {
      let msg
      try {
        msg = JSON.parse(m.data)
      } catch {
        return
      }
      if (msg.t === 'ready') return refresh()

      const seats = msg.seats || []
      if (msg.t === 'hold') setHeld((s) => union(s, seats))
      if (msg.t === 'release') setHeld((s) => minus(s, seats))
      if (msg.t === 'book') {
        setBooked((s) => union(s, seats))
        setHeld((s) => minus(s, seats))
      }
      pulse(seats)
    }
    return () => {
      source.close()
      clearTimeout(flashTimer.current)
    }
  }, [eventId, refresh, pulse])

  return { layout, booked, held, flash, live, error, refresh }
}

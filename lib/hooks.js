'use client'

import { useEffect, useState } from 'react'


export function useEvents({ recent = false, limit } = {}) {
  const [state, setState] = useState({ events: [], loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    const url = recent ? '/api/v1/events?recent=true' : '/api/v1/events'

    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Could not load events'))))
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setState({ events: limit ? list.slice(0, limit) : list, loading: false, error: null })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ events: [], loading: false, error })
      })

    return () => controller.abort()
  }, [recent, limit])

  return state
}

/** One published event by id. `refetch()` reloads it (e.g. after a booking). */
export function useEvent(id) {
  const [state, setState] = useState({ event: null, loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()

    fetch(`/api/v1/events/${id}`, { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Event not found'))))
      .then((event) => setState({ event, loading: false, error: null }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ event: null, loading: false, error })
      })

    return () => controller.abort()
  }, [id, tick])

  return { ...state, refetch: () => setTick((t) => t + 1) }
}

/**
 * Seats nobody can pick right now (paid + briefly held by someone paying).
 * Live: a REST snapshot on open and every 5s (holds expire silently, so polling covers expiry),
 * plus Server-Sent Events for instant hold / release / book pushes from other buyers.
 */
export function useSeats(eventId, enabled = true) {
  const [state, setState] = useState({ taken: [], loading: true, live: false })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!eventId || !enabled) return
    let controller = new AbortController()
    let source = null

    const sameSeats = (a, b) => a.length === b.length && a.every((s) => b.includes(s))

    const load = () => {
      controller.abort()
      controller = new AbortController()
      fetch(`/api/v1/events/${eventId}/seats`, { signal: controller.signal, cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Seats unavailable'))))
        .then((data) => {
          const taken = data.taken || []
          // Keep the same state object when nothing changed, so the page doesn't re-render every 5s.
          setState((prev) => (prev.loading === false && sameSeats(prev.taken, taken) ? prev : { ...prev, taken, loading: false }))
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setState((prev) => ({ ...prev, loading: false }))
        })
    }

    load()
    const poll = setInterval(() => {
      if (!document.hidden) load()
    }, 5000)

    if (typeof EventSource !== 'undefined') {
      source = new EventSource(`/api/v1/events/${eventId}/stream`)
      source.onopen = () => setState((prev) => ({ ...prev, live: true }))
      source.onerror = () => setState((prev) => ({ ...prev, live: false }))
      source.onmessage = (m) => {
        let msg
        try {
          msg = JSON.parse(m.data)
        } catch {
          return
        }
        if (msg.t === 'ready') return load()

        const seats = msg.seats || []
        setState((prev) => {
          const next = new Set(prev.taken)
          if (msg.t === 'hold' || msg.t === 'book') seats.forEach((s) => next.add(s))
          if (msg.t === 'release') seats.forEach((s) => next.delete(s))
          return { ...prev, taken: [...next] }
        })
      }
    }

    return () => {
      controller.abort()
      clearInterval(poll)
      if (source) source.close()
    }
  }, [eventId, enabled, tick])

  return { ...state, refetch: () => setTick((t) => t + 1) }
}

const CITY_KEY = 'qpie_city'

/** Selected city, remembered across visits ('' = all cities). */
export function useCity() {
  const [city, setCityState] = useState('')

  useEffect(() => {
    try {
      setCityState(localStorage.getItem(CITY_KEY) || '')
    } catch {}
  }, [])

  function setCity(next) {
    setCityState(next)
    try {
      if (next) localStorage.setItem(CITY_KEY, next)
      else localStorage.removeItem(CITY_KEY)
    } catch {}
  }

  return [city, setCity]
}

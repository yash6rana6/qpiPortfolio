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

/** Seats nobody can pick right now (paid + briefly held by someone paying). */
export function useSeats(eventId, enabled = true) {
  const [state, setState] = useState({ taken: [], loading: true })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!eventId || !enabled) return
    const controller = new AbortController()

    fetch(`/api/v1/events/${eventId}/seats`, { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Seats unavailable'))))
      .then((data) => setState({ taken: data.taken || [], loading: false }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ taken: [], loading: false })
      })

    return () => controller.abort()
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

import { newConnection } from './redis'

const g = globalThis

function state() {
  if (!g._qpieSub) {
    const conn = newConnection()
    const listeners = new Map()
    conn.on('message', (channel, message) => {
      const set = listeners.get(channel)
      if (!set) return
      for (const fn of set) {
        try {
          fn(message)
        } catch {}
      }
    })
    g._qpieSub = { conn, listeners }
  }
  return g._qpieSub
}

/**
 * ONE Redis subscriber per server process, shared by every SSE client.
 * 1000 browsers watching a show = 1 Redis connection, not 1000.
 */
export function subscribe(channel, fn) {
  const s = state()
  let set = s.listeners.get(channel)
  if (!set) {
    set = new Set()
    s.listeners.set(channel, set)
    s.conn.subscribe(channel).catch(() => {})
  }
  set.add(fn)

  let active = true
  return () => {
    if (!active) return
    active = false
    set.delete(fn)
    if (set.size === 0 && s.listeners.get(channel) === set) {
      s.listeners.delete(channel)
      s.conn.unsubscribe(channel).catch(() => {})
    }
  }
}

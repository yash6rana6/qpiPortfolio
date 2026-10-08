import { Queue } from 'bullmq'
import { newConnection } from './redis'

export const QUEUE_NAME = 'bookings'

export function bookingQueue() {
  if (!globalThis._qpieQueue) {
    globalThis._qpieQueue = new Queue(QUEUE_NAME, {
      connection: newConnection({ enableOfflineQueue: false }),
      defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 5000 }
    })
    globalThis._qpieQueue.on('error', () => {})
  }
  return globalThis._qpieQueue
}

/** Never lets a queue problem block or break a user request. */
export async function enqueue(name, data, opts = {}) {
  try {
    await Promise.race([
      bookingQueue().add(name, data, opts),
      new Promise((_, reject) => setTimeout(() => reject(new Error('queue timeout')), 1500))
    ])
    return true
  } catch (err) {
    console.error('[queue] could not enqueue', name, err.message)
    return false
  }
}

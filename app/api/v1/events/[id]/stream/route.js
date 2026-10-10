import { getEventLite, channelFor } from '../../../../../../lib/seatStore'
import { subscribe } from '../../../../../../lib/pubsub'
import { fail, ApiError } from '../../../../../../lib/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-Sent Events: pushes seat changes (hold / release / book) to every
 * browser looking at this show, in real time. The browser's EventSource
 * reconnects by itself, and the client also polls as a safety net (holds
 * expire silently, so polling covers expiry).
 */
export async function GET(request, { params }) {
  try {
    const event = await getEventLite(params.id)
    if (!event || event.status !== 'published') throw new ApiError(404, 'Show not found')

    const encoder = new TextEncoder()
    let cleanup = () => {}

    const stream = new ReadableStream({
      start(controller) {
        const send = (chunk) => {
          try {
            controller.enqueue(encoder.encode(chunk))
          } catch {
            cleanup()
          }
        }

        const unsubscribe = subscribe(channelFor(params.id), (message) => send(`data: ${message}\n\n`))
        const heartbeat = setInterval(() => send(': ping\n\n'), 20000)

        cleanup = () => {
          clearInterval(heartbeat)
          unsubscribe()
          try {
            controller.close()
          } catch {}
        }

        request.signal.addEventListener('abort', cleanup)
        send('retry: 3000\n\n')
        send(`data: ${JSON.stringify({ t: 'ready' })}\n\n`)
      },
      cancel() {
        cleanup()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (err) {
    return fail(err)
  }
}

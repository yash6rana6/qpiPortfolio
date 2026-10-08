import { NextResponse } from 'next/server'
import { getEventLite, getSeatMap, layoutOf } from '../../../../../../lib/seats'
import { fail, ApiError } from '../../../../../../lib/api'

export const dynamic = 'force-dynamic'

/**
 * Seat map snapshot: layout + sold seats + seats someone is paying for right now.
 * Served from Redis (one Lua round trip) — this is the hot read path.
 */
export async function GET(_request, { params }) {
  try {
    const event = await getEventLite(params.id)
    if (!event || event.status !== 'published') throw new ApiError(404, 'Show not found')

    const { booked, held, degraded } = await getSeatMap(params.id)

    return NextResponse.json(
      {
        eventId: params.id,
        title: event.title,
        city: event.city,
        venue: event.venue,
        date: event.date,
        pricePerSeat: event.pricePerSeat,
        ...layoutOf(event),
        booked,
        held,
        degraded
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    return fail(err)
  }
}

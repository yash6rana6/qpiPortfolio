import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import { cached } from '../../../../lib/redis'
import { ok, fail } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

// Public — cities that have at least one upcoming published show.
export async function GET() {
  try {
    const cities = await cached('cities', 60, async () => {
      await connectDB()
      const rows = await Event.aggregate([
        {
          $match: {
            status: 'published',
            city: { $nin: [null, ''] },
            $or: [{ date: null }, { date: { $gte: new Date() } }]
          }
        },
        { $group: { _id: '$city', shows: { $sum: 1 } } },
        { $sort: { shows: -1, _id: 1 } }
      ])
      return rows.map((r) => ({ city: r._id, shows: r.shows }))
    })

    const res = ok(cities)
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res
  } catch (err) {
    return fail(err)
  }
}

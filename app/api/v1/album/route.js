import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import Media from '../../../../models/Media'
import { eventFolder } from '../../../../lib/media.js'
import { cached } from '../../../../lib/redis'
import { ok, fail } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

const MAX_MEDIA = 1500

async function buildAlbums() {
  await connectDB()

  const [events, media] = await Promise.all([
    Event.find({ status: 'published' })
      .select('title category date venue city posterImage accentColor')
      .sort({ date: -1 })
      .lean(),
    Media.find()
      .select('name folder resourceType url width height duration createdAt')
      .sort({ createdAt: 1 })
      .limit(MAX_MEDIA)
      .lean()
  ])

  const byFolder = new Map()
  for (const m of media) {
    const list = byFolder.get(m.folder)
    if (list) list.push(m)
    else byFolder.set(m.folder, [m])
  }

  const claimed = new Set()
  const albums = []

  for (const ev of events) {
    const folder = eventFolder(ev.title)
    // Two events with the same title would share one folder: the newest one gets the album.
    if (!folder || claimed.has(folder)) continue
    claimed.add(folder)

    const files = []
    for (const [name, list] of byFolder) {
      if (name === folder || name.startsWith(`${folder}/`)) files.push(...list)
    }
    if (!files.length) continue

    files.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    albums.push({
      _id: ev._id,
      title: ev.title,
      category: ev.category,
      date: ev.date,
      venue: ev.venue,
      city: ev.city,
      posterImage: ev.posterImage,
      items: files.map((f) => ({
        _id: f._id,
        name: f.name,
        resourceType: f.resourceType,
        url: f.url,
        width: f.width,
        height: f.height,
        duration: f.duration
      }))
    })
  }

  return { albums }
}

/**
 * Public. The photo/video album: one chapter per published event, filled with the media-library files
 * whose folder is named after that event (folder "neon-fest-2026" -> event "Neon Fest 2026";
 * sub-folders such as "neon-fest-2026/day-2" belong to it too). Events with no files are left out.
 * Built from up to 1500 media rows, so it is cached in Redis for a minute (admin event edits clear it too;
 * a new upload shows up within that minute).
 */
export async function GET() {
  try {
    const body = await cached('album', 60, buildAlbums)

    const res = ok(body)
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res
  } catch (err) {
    return fail(err)
  }
}

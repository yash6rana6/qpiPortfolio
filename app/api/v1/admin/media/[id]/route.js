import mongoose from 'mongoose'
import { connectDB } from '../../../../../../lib/mongodb'
import Media from '../../../../../../models/Media'
import Event from '../../../../../../models/Event'
import { requireAdmin } from '../../../../../../lib/auth'
import { destroyAsset } from '../../../../../../lib/cloudinary'
import { ok, fail, ApiError } from '../../../../../../lib/api'

export const dynamic = 'force-dynamic'

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Deletes the file from Cloudinary AND the library. Refuses while an event still uses it. */
export async function DELETE(_request, { params }) {
  try {
    await requireAdmin()
    if (!mongoose.isValidObjectId(params.id)) throw new ApiError(404, 'File not found')
    await connectDB()

    const media = await Media.findById(params.id)
    if (!media) throw new ApiError(404, 'File not found')

    const needle = { $regex: escapeRegex(media.publicId) }
    const inUse = await Event.find({ $or: [{ posterImage: needle }, { videoUrl: needle }] }).select('title').limit(3).lean()
    if (inUse.length) {
      throw new ApiError(
        409,
        `This file is used by: ${inUse.map((e) => e.title).join(', ')}. Change that event's poster/video first.`
      )
    }

    await destroyAsset(media.publicId, media.resourceType)
    await media.deleteOne()
    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}

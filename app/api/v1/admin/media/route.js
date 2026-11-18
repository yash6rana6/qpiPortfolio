import { connectDB } from '../../../../../lib/mongodb'
import Media from '../../../../../models/Media'
import { requireAdmin } from '../../../../../lib/auth'
import { ROOT_FOLDER, RESOURCE_TYPES, cleanFolder, cloudinaryConfig } from '../../../../../lib/cloudinary'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Library list. ?folder=concerts (includes sub-folders) &type=image|video &q=search-in-name */
export async function GET(request) {
  try {
    await requireAdmin()
    await connectDB()
    const { searchParams } = new URL(request.url)

    const filter = {}
    const folder = searchParams.get('folder')
    if (folder) {
      const f = cleanFolder(folder)
      filter.$or = [{ folder: f }, { folder: { $regex: `^${escapeRegex(f)}/` } }]
    }
    const type = searchParams.get('type')
    if (RESOURCE_TYPES.includes(type)) filter.resourceType = type
    const q = (searchParams.get('q') || '').trim().slice(0, 60)
    if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' }

    const [items, folders] = await Promise.all([
      Media.find(filter).sort({ createdAt: -1 }).limit(300).lean(),
      Media.aggregate([{ $group: { _id: '$folder', count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    ])

    return ok({ items, folders: folders.map((f) => ({ name: f._id, count: f.count })) })
  } catch (err) {
    return fail(err)
  }
}

/** Step 3 of an upload: the file is on Cloudinary, now list it in the library. */
export async function POST(request) {
  try {
    const admin = await requireAdmin()
    const { cloudName } = cloudinaryConfig()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['name', 'folder', 'resourceType', 'publicId', 'url'])
    if (!RESOURCE_TYPES.includes(body.resourceType)) throw new ApiError(400, 'Invalid file type')

    const folder = cleanFolder(body.folder)
    const publicId = String(body.publicId)
    const url = String(body.url)

    // Only accept files that really are in OUR Cloudinary account and OUR folder.
    if (publicId.includes('..') || !publicId.startsWith(`${ROOT_FOLDER}/${folder}/`)) {
      throw new ApiError(400, 'That file is not in the media folder')
    }
    if (!url.startsWith(`https://res.cloudinary.com/${cloudName}/${body.resourceType}/upload/`) || !url.includes(publicId)) {
      throw new ApiError(400, 'Invalid file URL')
    }

    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined)

    let item
    try {
      item = await Media.create({
        name: String(body.name).trim().slice(0, 80),
        folder,
        publicId,
        resourceType: body.resourceType,
        url,
        format: body.format ? String(body.format).slice(0, 10) : undefined,
        bytes: num(body.bytes),
        width: num(body.width),
        height: num(body.height),
        duration: num(body.duration),
        uploadedBy: admin.sub
      })
    } catch (err) {
      if (err?.code === 11000) throw new ApiError(409, 'This file is already in the library')
      throw err
    }

    return ok(item, 201)
  } catch (err) {
    return fail(err)
  }
}

import crypto from 'crypto'
import { requireAdmin } from '../../../../../../lib/auth'
import { ROOT_FOLDER, RESOURCE_TYPES, cleanFolder, cloudinaryConfig, fileSlug, signParams } from '../../../../../../lib/cloudinary'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../../lib/api'

export const dynamic = 'force-dynamic'

/**
 * Step 1 of an upload. Admin only. Validates name/folder and returns a short-lived signature so the
 * browser can send the file straight to Cloudinary. The folder + public_id are locked into the signature,
 * so the browser can't upload anywhere else.
 */
export async function POST(request) {
  try {
    await requireAdmin()
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig()

    const body = await readJson(request)
    requireFields(body, ['name', 'resourceType'])
    if (!RESOURCE_TYPES.includes(body.resourceType)) throw new ApiError(400, 'Only image or video files can be uploaded')

    const name = String(body.name).trim().slice(0, 80)
    if (!name) throw new ApiError(400, 'Give the file a name')

    const subFolder = cleanFolder(body.folder)
    const folder = `${ROOT_FOLDER}/${subFolder}`
    const publicId = `${fileSlug(name)}-${crypto.randomBytes(3).toString('hex')}`
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signParams({ folder, public_id: publicId, timestamp }, apiSecret)

    return ok({
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${body.resourceType}/upload`,
      apiKey,
      timestamp,
      signature,
      folder,
      subFolder,
      publicId
    })
  } catch (err) {
    return fail(err)
  }
}

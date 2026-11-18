import crypto from 'crypto'
import { ApiError } from './api'

/**
 * SERVER-ONLY Cloudinary helpers. No SDK needed: uploads go browser -> Cloudinary directly with a
 * signature made here (so the API secret never reaches the browser and big videos never pass
 * through our server).
 */
export const ROOT_FOLDER = (process.env.CLOUDINARY_ROOT_FOLDER || 'qpie').replace(/^\/+|\/+$/g, '')
export const RESOURCE_TYPES = ['image', 'video']

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      'Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local'
    )
  }
  return { cloudName, apiKey, apiSecret }
}

/** Cloudinary signature: sorted "k=v" pairs joined by "&", + api_secret, SHA-1 hex. */
export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')
}

const slugPart = (s, max) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)

/** "Concert Posters / 2026" -> "concert-posters/2026". Up to 3 levels; empty -> "general". */
export function cleanFolder(input) {
  const parts = String(input || '')
    .split('/')
    .map((p) => slugPart(p, 40))
    .filter(Boolean)
  if (!parts.length) return 'general'
  if (parts.length > 3) throw new ApiError(400, 'Folder can have at most 3 levels')
  return parts.join('/')
}

export const fileSlug = (name) => slugPart(name, 50) || 'file'

/** Deletes the file on Cloudinary. Resolves for "ok" and "not found" (already gone). */
export async function destroyAsset(publicId, resourceType) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = signParams({ invalidate: 'true', public_id: publicId, timestamp }, apiSecret)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: 'POST',
    body: new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      invalidate: 'true',
      api_key: apiKey,
      signature
    })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(502, data?.error?.message || 'Cloudinary could not delete the file')
  return data.result
}

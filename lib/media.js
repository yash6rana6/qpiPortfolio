// Browser-safe media helpers (no secrets, no server imports).

export const MAX_IMAGE_MB = 10 // Cloudinary free plan limits — Cloudinary rejects bigger files anyway
export const MAX_VIDEO_MB = 100

export function formatBytes(n) {
  if (!n) return '0 KB'
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(sec) {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Media-library folder that belongs to an event's album: the event title, slugged exactly the way the
 * uploader slugs a typed folder name ("Neon Fest 2026" -> "neon-fest-2026"). Keep in sync with
 * cleanFolder() in lib/cloudinary.js. Returns '' when the title has no usable letters/digits.
 */
export function eventFolder(title) {
  return String(title || '')
    .split('/')
    .map((p) => p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40))
    .filter(Boolean)
    .join('/')
}

const CLD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(v\d+\/.+)$/

/** Adds a transformation to a Cloudinary URL (only when it has none yet). Other URLs pass through. */
function withTransform(url, transform) {
  const m = typeof url === 'string' ? url.match(CLD) : null
  return m ? `${m[1]}${transform}/${m[2]}` : url
}

/** Smaller + modern format (webp/avif) automatically — same picture, less bandwidth. */
export const optimizedImage = (url, width) =>
  withTransform(url, `f_auto,q_auto${width ? `,w_${width}` : ''}`)

/** Small preview for the dashboard grid. Videos get a still frame from second 0. */
export function thumbUrl(item) {
  if (!item?.url) return ''
  if (item.resourceType === 'video') {
    const still = withTransform(item.url, 'so_0,c_fill,w_480,h_320,f_jpg,q_auto')
    return still.replace(/\.[a-z0-9]+$/i, '.jpg')
  }
  return withTransform(item.url, 'c_fill,w_480,h_320,f_auto,q_auto')
}

/**
 * Whole upload in 3 steps: ask our server for a signature -> send the file straight to Cloudinary
 * (with progress) -> tell our server so it lists in the library. Resolves with the saved media item.
 */
export async function uploadMedia({ file, name, folder, onProgress }) {
  const resourceType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null
  if (!resourceType) throw new Error('Only image or video files can be uploaded')

  const limit = (resourceType === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024
  if (file.size > limit) {
    throw new Error(`${resourceType === 'video' ? 'Videos' : 'Images'} can be up to ${resourceType === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB} MB`)
  }

  const signRes = await fetch('/api/v1/admin/media/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, folder, resourceType })
  })
  const sig = await signRes.json()
  if (!signRes.ok) throw new Error(sig.error || 'Upload could not be started')

  const uploaded = await new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('api_key', sig.apiKey)
    form.append('timestamp', String(sig.timestamp))
    form.append('signature', sig.signature)
    form.append('folder', sig.folder)
    form.append('public_id', sig.publicId)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', sig.uploadUrl)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) resolve(data)
      else reject(new Error(data?.error?.message || 'Upload to Cloudinary failed'))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading. Try again.'))
    xhr.send(form)
  })

  const saveRes = await fetch('/api/v1/admin/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      folder: sig.subFolder,
      resourceType,
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      format: uploaded.format,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      duration: uploaded.duration
    })
  })
  const saved = await saveRes.json()
  if (!saveRes.ok) throw new Error(saved.error || 'Uploaded, but it could not be added to the library')
  return saved
}

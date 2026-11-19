'use client'

import { useState } from 'react'
import { optimizedImage } from '../../lib/media.js'
import { cn, posterBackground } from '../../lib/utils.js'

/**
 * Event poster that fills its (relatively positioned) parent like `bg-cover bg-center` did, but as a real
 * <img>: lazy-loaded, decoded off the main thread, and resized when it is a Cloudinary file.
 *   width    - CSS px of the biggest place it is shown (doubled for retina screens).
 *   priority - above-the-fold image: load right away instead of lazily.
 * Missing or broken image -> the same pink/dark gradient the old background used.
 */
export default function PosterImg({ src, alt = '', width = 640, priority = false, className }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div aria-hidden="true" className={cn('absolute inset-0', className)} style={posterBackground(null)} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizedImage(src, width * 2)}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('absolute inset-0 h-full w-full object-cover', className)}
    />
  )
}

'use client'

import { useEffect, useRef } from 'react'

/**
 * Looping muted <video> that downloads and plays only while it is on (or just about to be on) screen.
 * A plain <video autoPlay> starts fetching the moment the page renders, even for a video 3 screens down.
 */
export default function LazyVideo({ src, poster, className, rootMargin = '200px', ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    const video = ref.current
    if (!video || !src) return

    const start = () => {
      if (!video.getAttribute('src')) video.src = src
      video.play().catch(() => {}) // autoplay can be blocked (data saver, low power): the poster just stays
    }

    if (typeof IntersectionObserver === 'undefined') {
      start()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start()
        else video.pause()
      },
      { rootMargin }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [src, rootMargin])

  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" {...rest} />
}

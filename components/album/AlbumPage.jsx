'use client'

import { useEffect, useState } from 'react'
import Navbar from '../Navbar.jsx'
import Footer from '../Footer.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import AlbumBook from './AlbumBook.jsx'

export default function AlbumPage() {
  const [state, setState] = useState({ albums: [], loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/v1/album', { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Could not load the album'))))
      .then((data) => setState({ albums: Array.isArray(data?.albums) ? data.albums : [], loading: false, error: null }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ albums: [], loading: false, error })
      })

    return () => controller.abort()
  }, [])

  const { albums, loading, error } = state

  return (
    <main className="min-h-screen bg-[#120a06] text-white">
      <Navbar tone="overlay" />

      <section className="relative overflow-hidden px-4 pb-24 pt-32 md:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(255,182,39,0.14), transparent 60%)' }}
        />

        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading tone="dark" eyebrow="Every show, every memory" title="Album" />

          {loading && <div className="mx-auto mt-16 aspect-[7/5] w-full max-w-3xl animate-pulse rounded-3xl bg-white/10" />}

          {!loading && error && (
            <div className="mt-16">
              <EmptyState tone="dark" title="Album unavailable" message="We couldn't open the album right now. Please try again in a moment." />
            </div>
          )}

          {!loading && !error && albums.length === 0 && (
            <div className="mt-16">
              <EmptyState tone="dark" title="The album is still empty" message="Photos and videos from our shows will be pasted in here soon." />
            </div>
          )}

          {!loading && !error && albums.length > 0 && (
            <>
              <p className="mx-auto mt-6 max-w-md text-center text-sm text-white/55">
                Tap a page to turn it. Tap any photo or video to take a closer look.
              </p>
              <div className="mt-10">
                <AlbumBook albums={albums} />
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}

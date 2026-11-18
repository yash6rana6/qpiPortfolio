'use client'

import { useEffect, useRef, useState } from 'react'
import Preloader from '../components/Preloader.jsx'
import Navbar from '../components/Navbar.jsx'
import LucknowNews from '../components/LucknowNews.jsx'
import Hero from '../components/Hero.jsx'
import Gallery from '../components/Gallery.jsx'
import RecentEvents from '../components/RecentEvents.jsx'
import Footer from '../components/Footer.jsx'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [tone, setTone] = useState('solid')
  const newsRef = useRef(null)

  // Navbar: light bar while the sand-coloured news section is under it, floating overlay once the dark hero arrives.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const bottom = newsRef.current?.getBoundingClientRect().bottom ?? 0
      setTone(bottom > 70 ? 'solid' : 'overlay')
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <main className="min-h-screen bg-sand text-ink">
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <Navbar tone={tone} />
      <div ref={newsRef}>
        <LucknowNews ready={!loading} />
      </div>
      <Hero />
      <Gallery />
      <RecentEvents />
      <Footer />
    </main>
  )
}

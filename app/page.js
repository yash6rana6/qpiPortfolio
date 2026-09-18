'use client'

import { useState } from 'react'
import Preloader from '../components/Preloader.jsx'
import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import Gallery from '../components/Gallery.jsx'
import RecentEvents from '../components/RecentEvents.jsx'
import Footer from '../components/Footer.jsx'

export default function Home() {
  const [loading, setLoading] = useState(true)

  return (
    <main className="min-h-screen bg-sand text-ink">
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <Navbar />
      <Hero />
      <Gallery />
      <RecentEvents />
      <Footer />
    </main>
  )
}

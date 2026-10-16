'use client'

import Navbar from '../../components/Navbar.jsx'
import Footer from '../../components/Footer.jsx'
import RecentEvents from '../../components/RecentEvents.jsx'

export default function RecentPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-ink">
      <Navbar />
      <RecentEvents limit={null} standalone />
      <Footer />
    </main>
  )
}
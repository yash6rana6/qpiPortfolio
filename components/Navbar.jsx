'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider.jsx'

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-black/15 px-6 py-5 backdrop-blur-md md:px-16">
      <Link href="/" className="font-display text-lg font-semibold tracking-tight text-white">
        QPIE
      </Link>

      <nav className="flex items-center gap-6">
        <a href="#gallery" className="hidden text-sm text-white/70 transition-colors hover:text-white md:inline">
          Events
        </a>
        <a href="#recent-events" className="hidden text-sm text-white/70 transition-colors hover:text-white md:inline">
          Recent
        </a>

        {!loading && user && (
          <>
            <Link href="/bookings" className="hidden text-sm text-white/70 transition-colors hover:text-white md:inline">
              My tickets
            </Link>
            {user.role === 'admin' && (
              <Link href="/admin" className="hidden text-sm text-mango transition-colors hover:text-white md:inline">
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Sign out
            </button>
          </>
        )}

        {!loading && !user && (
          <Link href="/login" className="text-sm text-white/70 transition-colors hover:text-white">
            Sign in
          </Link>
        )}

        <Link
          href="/bookshow"
          className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Book My Show
        </Link>
      </nav>
    </header>
  )
}

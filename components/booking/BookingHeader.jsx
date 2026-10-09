'use client'

import Link from 'next/link'
import { useAuth } from '../AuthProvider.jsx'
import { initials } from '../../lib/utils.js'

/** White top bar like the District flow: logo · event title + venue · account. */
export default function BookingHeader({ title, subtitle, backHref = '/' }) {
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 md:px-8">
        <Link href={backHref} className="font-display text-2xl font-black tracking-tight text-ink">
          QPIE
        </Link>

        <div className="min-w-0 text-center">
          <p className="truncate font-display text-base font-bold text-ink md:text-xl">{title}</p>
          {subtitle && <p className="truncate text-xs text-ink/50 md:text-sm">{subtitle}</p>}
        </div>

        {!loading && user ? (
          <Link
            href="/bookings"
            aria-label="My tickets"
            title="My tickets"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xs font-bold text-white"
          >
            {initials(user.name) || 'U'}
          </Link>
        ) : (
          <Link
            href="/login?next=%2Fevents"
            className="rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}

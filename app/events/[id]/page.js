'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '../../../components/Navbar.jsx'
import Footer from '../../../components/Footer.jsx'
import EmptyState from '../../../components/ui/EmptyState.jsx'
import { useEvent } from '../../../lib/hooks.js'
import { cn, formatDate, formatTime, formatPrice, posterBackground } from '../../../lib/utils.js'

function Fact({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink/10 py-3 last:border-0">
      <dt className="text-sm text-ink/50">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

export default function EventPage() {
  const { id } = useParams()
  const { event, loading, error } = useEvent(id)

  const bookable = event && event.pricePerSeat > 0 && event.availableSeats > 0
  const price = event ? formatPrice(event.pricePerSeat) : ''

  return (
    <main className="min-h-screen bg-sand text-ink">
      <Navbar tone="solid" />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-32 md:px-8">
        {loading && <div className="h-96 animate-pulse rounded-3xl bg-ink/5" />}

        {!loading && (error || !event) && (
          <div className="pt-12">
            <EmptyState title="Event not found" message="It may have been removed or isn't published yet." />
            <p className="mt-6 text-center">
              <Link href="/events" className="text-sm font-semibold text-coral underline">
                Browse all events
              </Link>
            </p>
          </div>
        )}

        {event && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-coral">{event.category}</p>
            <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">
              {event.title}
            </h1>
            <p className="mt-4 text-lg font-semibold text-ocean">
              {[formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' }), formatTime(event.date)]
                .filter(Boolean)
                .join(', ') || 'Date to be announced'}
            </p>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
              <div>
                <div className="overflow-hidden rounded-3xl bg-black shadow-xl">
                  {event.videoUrl ? (
                    <video
                      src={event.videoUrl}
                      poster={event.posterImage}
                      className="aspect-video w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div className="aspect-video w-full bg-cover bg-center" style={posterBackground(event.posterImage)} />
                  )}
                </div>

                {event.description && (
                  <section className="mt-10">
                    <h2 className="font-display text-2xl font-black uppercase tracking-tight">About the event</h2>
                    <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-ink/75">{event.description}</p>
                  </section>
                )}
              </div>

              <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm lg:sticky lg:top-28">
                {price && (
                  <p className="font-display text-4xl font-black">
                    {price} <span className="text-base font-semibold text-ink/40">/ seat</span>
                  </p>
                )}

                <dl className={cn(price && 'mt-5')}>
                  <Fact label="Date" value={formatDate(event.date) || 'To be announced'} />
                  <Fact label="Time" value={formatTime(event.date) || 'To be announced'} />
                  <Fact label="Venue" value={event.venue || 'To be announced'} />
                  {event.city && <Fact label="City" value={event.city} />}
                  <Fact label="Seats" value={event.availableSeats > 0 ? `${event.availableSeats} left` : 'Sold out'} />
                </dl>

                {bookable ? (
                  <Link
                    href={`/bookshow?event=${event._id}`}
                    className="mt-6 block rounded-xl bg-coral py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5"
                  >
                    Book tickets
                  </Link>
                ) : (
                  <span className="mt-6 block rounded-xl bg-ink/5 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-ink/40">
                    {event.availableSeats <= 0 ? 'Sold out' : 'Not on sale yet'}
                  </span>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      <Footer />
    </main>
  )
}

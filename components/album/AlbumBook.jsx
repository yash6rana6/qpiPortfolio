'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn, clamp, formatDate, posterBackground } from '../../lib/utils.js'
import { formatDuration, optimizedImage, thumbUrl } from '../../lib/media.js'
import { prefersReducedMotion } from '../../lib/motion.js'
import { ArrowIcon } from '../ui/Icons.jsx'


const PAGE_W = 320
const PAGE_H = 450
const TURN_MS = 900
const PAPER = '#fbf3e3'
const TILTS = [-1.6, 1.2, -0.8, 1.8]

// ---------- page layout ----------

function buildPages(albums) {
  const pages = [{ type: 'cover' }, { type: 'welcome' }, { type: 'contents' }]
  const chapters = []

  albums.forEach((album, i) => {
    // Chapter openers always sit on the LEFT page of a spread (odd index), photos open to their right.
    if (pages.length % 2 === 0) pages.push({ type: 'blank', album: albums[i - 1] })
    chapters.push({ album, page: pages.length })
    pages.push({ type: 'chapter', album })
    for (let n = 0; n < album.items.length; n += 2) {
      pages.push({ type: 'photos', album, items: album.items.slice(n, n + 2) })
    }
  })

  // The back cover must be the last (odd-indexed) page, so the page count stays even.
  while (pages.length % 2 === 0) pages.push({ type: 'blank' })
  pages.push({ type: 'back' })
  return { pages, chapters }
}

const countOf = (album, type) => album.items.filter((i) => i.resourceType === type).length

// ---------- small pieces ----------

function Corner({ side }) {
  const right = side === 'right'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute bottom-0 h-0 w-0 opacity-0 transition-all duration-300 group-hover:h-9 group-hover:w-9 group-hover:opacity-100',
        right ? 'right-0' : 'left-0'
      )}
      style={{
        background: `linear-gradient(to top ${right ? 'left' : 'right'}, #cdb98f 0%, #f4e8cf 48%, transparent 50%)`
      }}
    />
  )
}

/** One side of a leaf. `side="right"` = front of a leaf (spine on its left), `"left"` = back (spine on its right). */
function Face({ side, bare, onClick, children }) {
  const right = side === 'right'
  return (
    <div
      onClick={onClick}
      className={cn('group absolute inset-0 cursor-pointer overflow-hidden', right ? 'rounded-r-md' : 'rounded-l-md')}
      style={{
        backgroundColor: bare ? undefined : PAPER,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: right ? undefined : 'rotateY(180deg)'
      }}
    >
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to ${right ? 'right' : 'left'}, rgba(43,27,18,0.3), rgba(43,27,18,0) 10%)`
        }}
      />
      <Corner side={side} />
    </div>
  )
}

function PageNumber({ n, dark }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-[10px] tracking-[0.3em]',
        dark ? 'text-white/50' : 'text-ink/35'
      )}
    >
      {n}
    </span>
  )
}

const FOIL = 'bg-gradient-to-b from-[#ffe9a8] via-mango to-[#b9801a] bg-clip-text text-transparent'

function leather(extra) {
  return {
    background: 'radial-gradient(120% 90% at 30% 20%, #5a2a85 0%, #3D1A5B 45%, #1f0f2e 100%)',
    ...extra
  }
}

function CoverArt({ stats }) {
  const bits = [
    stats.events && `${stats.events} show${stats.events > 1 ? 's' : ''}`,
    stats.photos && `${stats.photos} photo${stats.photos > 1 ? 's' : ''}`,
    stats.videos && `${stats.videos} video${stats.videos > 1 ? 's' : ''}`
  ].filter(Boolean)

  return (
    <>
      <div className="absolute inset-0" style={leather()} />
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{ backgroundImage: 'repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.09) 0 1px, transparent 1px 3px)' }}
      />
      <div className="absolute inset-4 rounded-md border border-dashed border-mango/50" />
      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-mango/80">QPIE Digital</p>
        <h3 className={cn('mt-6 font-display text-5xl font-black uppercase leading-[0.95]', FOIL)}>
          Memory
          <br />
          Album
        </h3>
        <span className="mt-6 block h-px w-16 bg-mango/60" />
        {bits.length > 0 && (
          <p className="mt-6 rounded-sm border border-mango/50 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-mango/90">
            {bits.join(' · ')}
          </p>
        )}
        <p className="absolute bottom-9 flex animate-pulse items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
          Tap to open <ArrowIcon className="h-3.5 w-3.5" />
        </p>
      </div>
    </>
  )
}

function BackArt() {
  return (
    <>
      <div className="absolute inset-0" style={leather()} />
      <div className="absolute inset-4 rounded-md border border-dashed border-mango/40" />
      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <p className={cn('font-display text-4xl font-black uppercase', FOIL)}>QPIE</p>
        <span className="mt-4 block h-px w-12 bg-mango/60" />
        <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-white/60">Until the next show</p>
      </div>
    </>
  )
}

function Welcome() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-9 text-center"
      style={{
        backgroundColor: '#f2e3c3',
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(61,26,91,0.05) 0 6px, transparent 6px 12px)'
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.4em] text-plum/60">Ex libris</p>
      <span className="mt-4 block h-px w-10 bg-coral" />
      <p className="mt-6 font-display text-2xl font-bold leading-snug text-plum">
        This album belongs to everyone who was there.
      </p>
      <p className="mt-6 text-xs italic text-ink/50">Turn the page to begin</p>
    </div>
  )
}

function Contents({ chapters, onJump, tabIndex }) {
  return (
    <div className="flex h-full flex-col px-7 pb-10 pt-9">
      <p className="text-[10px] uppercase tracking-[0.4em] text-ink/50">Index</p>
      <h3 className="mt-1 font-display text-3xl font-black uppercase text-plum">Contents</h3>
      <span className="mt-2 block h-0.5 w-10 bg-coral" />
      <ol className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {chapters.map(({ album, page }) => (
          <li key={album._id}>
            <button
              type="button"
              tabIndex={tabIndex}
              onClick={(e) => {
                e.stopPropagation()
                onJump(page)
              }}
              className="flex w-full items-baseline rounded px-1 py-1.5 text-left text-sm text-ink transition-colors hover:bg-coral/10"
            >
              <span className="truncate font-semibold">{album.title}</span>
              <span className="mx-2 min-w-4 flex-1 border-b border-dotted border-ink/30" />
              <span className="shrink-0 text-xs text-ink/50">{album.items.length}</span>
              <span className="ml-3 w-6 shrink-0 text-right text-xs font-bold text-coral">{page}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Chapter({ album }) {
  const photos = countOf(album, 'image')
  const videos = countOf(album, 'video')
  const meta = [formatDate(album.date), album.venue, album.city].filter(Boolean)

  return (
    <>
      <div className="absolute inset-0 bg-cover bg-center" style={posterBackground(album.posterImage)} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-7 pb-12">
        {album.category && (
          <span className="rounded-full bg-coral px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
            {album.category}
          </span>
        )}
        <h3 className="font-display text-3xl font-black uppercase leading-[0.95] text-white drop-shadow-lg">{album.title}</h3>
        {meta.length > 0 && <p className="text-xs text-white/75">{meta.join(' · ')}</p>}
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">
          {[photos && `${photos} photo${photos > 1 ? 's' : ''}`, videos && `${videos} video${videos > 1 ? 's' : ''}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </>
  )
}

function Blank({ album }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="text-lg text-ink/20">✦</span>
      {album && <p className="text-[10px] uppercase tracking-[0.3em] text-ink/30">{album.title}</p>}
    </div>
  )
}

function PlayIcon() {
  return (
    <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform group-hover/frame:scale-110">
      <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  )
}

/** One photo / video taped onto a page. Opens the viewer; never turns the page. */
function Frame({ item, tilt, onOpen, tabIndex }) {
  const isVideo = item.resourceType === 'video'
  return (
    <div className="relative flex min-h-0 flex-1" style={{ transform: `rotate(${tilt}deg)` }}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-2 left-1/2 z-10 h-4 w-14 -translate-x-1/2 -rotate-3 bg-mango/55 shadow-sm"
      />
      <button
        type="button"
        tabIndex={tabIndex}
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        aria-label={`${isVideo ? 'Play video' : 'View photo'}: ${item.name}`}
        className="group/frame flex min-h-0 flex-1 cursor-zoom-in flex-col bg-[#fffdf8] p-2 pb-1 text-left shadow-[0_6px_14px_rgba(43,27,18,0.28)] transition-transform duration-300 hover:scale-[1.03]"
      >
        <span className="relative min-h-0 flex-1 overflow-hidden bg-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isVideo ? thumbUrl(item) : optimizedImage(item.url, 640)}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {isVideo && (
            <>
              <PlayIcon />
              {item.duration > 0 && (
                <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {formatDuration(item.duration)}
                </span>
              )}
            </>
          )}
        </span>
        <span className="truncate pt-1 text-[11px] italic text-ink/60">{item.name}</span>
      </button>
    </div>
  )
}

function Photos({ page, index, onOpen, tabIndex }) {
  const single = page.items.length === 1
  return (
    <div className="flex h-full flex-col px-6 pb-9 pt-10">
      <p className="absolute inset-x-0 top-4 truncate px-6 text-center text-[9px] uppercase tracking-[0.3em] text-ink/40">
        {page.album.title}
      </p>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-6" style={{ paddingBlock: single ? '12%' : 0 }}>
        {page.items.map((item, i) => (
          <Frame
            key={item._id}
            item={item}
            tilt={TILTS[(index + i) % TILTS.length]}
            tabIndex={tabIndex}
            onOpen={() => onOpen(page.album, item)}
          />
        ))}
      </div>
    </div>
  )
}

// ---------- full-size viewer ----------

function Lightbox({ album, index, onClose, onStep }) {
  const item = album.items[index]
  const many = album.items.length > 1

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const round =
    'absolute z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-all hover:border-coral hover:bg-coral'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${album.title}: ${item.name}`}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
    >
      <button type="button" onClick={onClose} aria-label="Close" className={cn(round, 'right-4 top-4')}>
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {many && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation()
              onStep(-1)
            }}
            className={cn(round, 'left-3 top-1/2 -translate-y-1/2')}
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation()
              onStep(1)
            }}
            className={cn(round, 'right-3 top-1/2 -translate-y-1/2')}
          >
            <ArrowIcon direction="right" />
          </button>
        </>
      )}

      <div className="flex max-h-[78vh] w-full max-w-4xl items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {item.resourceType === 'video' ? (
          <video key={item.url} src={item.url} controls autoPlay playsInline className="max-h-[78vh] w-auto max-w-full rounded-lg bg-black" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.url} src={optimizedImage(item.url, 1600)} alt={item.name} className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain" />
        )}
      </div>

      <p className="mt-4 text-center text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
        {item.name}
        <span className="text-white/40">
          {' '}
          · {album.title} · {index + 1}/{album.items.length}
        </span>
      </p>
    </div>
  )
}

// ---------- the book ----------

export default function AlbumBook({ albums }) {
  const { pages, chapters } = useMemo(() => buildPages(albums), [albums])
  const leaves = pages.length / 2

  const stats = useMemo(
    () => ({
      events: albums.length,
      photos: albums.reduce((n, a) => n + countOf(a, 'image'), 0),
      videos: albums.reduce((n, a) => n + countOf(a, 'video'), 0)
    }),
    [albums]
  )

  const [state, setState] = useState({ flipped: 0, from: 0 })
  const [lightbox, setLightbox] = useState(null) // { album, index }
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [reduced, setReduced] = useState(false)
  const stageRef = useRef(null)
  const touchX = useRef(null)

  const { flipped, from } = state
  const turnMs = reduced ? 0 : TURN_MS

  useEffect(() => setReduced(prefersReducedMotion()), [])

  // Fit the fixed-size book to the screen.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: window.innerHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const scale = box.w ? clamp(Math.min((box.w - 16) / (PAGE_W * 2), (box.h - 240) / PAGE_H), 0.4, 1.4) : 1

  const goTo = useCallback(
    (target) =>
      setState((s) => {
        const next = clamp(target, 0, leaves)
        return next === s.flipped ? s : { flipped: next, from: s.flipped }
      }),
    [leaves]
  )
  const turn = useCallback(
    (dir) =>
      setState((s) => {
        const next = clamp(s.flipped + dir, 0, leaves)
        return next === s.flipped ? s : { flipped: next, from: s.flipped }
      }),
    [leaves]
  )
  const goToPage = useCallback((p) => goTo(Math.ceil(p / 2)), [goTo])

  const openItem = useCallback((album, item) => setLightbox({ album, index: album.items.indexOf(item) }), [])
  const stepLightbox = useCallback(
    (dir) =>
      setLightbox((l) => {
        if (!l) return l
        const n = l.album.items.length
        return { ...l, index: (l.index + dir + n) % n }
      }),
    []
  )

  useEffect(() => {
    const onKey = (e) => {
      if (lightbox) {
        if (e.key === 'Escape') setLightbox(null)
        else if (e.key === 'ArrowRight') stepLightbox(1)
        else if (e.key === 'ArrowLeft') stepLightbox(-1)
        return
      }
      if (e.key === 'ArrowRight') turn(1)
      else if (e.key === 'ArrowLeft') turn(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, turn, stepLightbox])

  // Where are we? (for the label under the book)
  const visibleIndex = flipped < leaves ? flipped * 2 : flipped * 2 - 1
  const label = useMemo(() => {
    if (flipped === 0) return 'Cover'
    if (flipped === leaves) return 'The end'
    let current = null
    for (const c of chapters) if (c.page <= visibleIndex) current = c
    return current ? current.album.title : 'Contents'
  }, [flipped, leaves, chapters, visibleIndex])

  // When several leaves turn at once (jumping via Contents), they follow each other instead of moving as one block.
  const steps = Math.abs(flipped - from)
  const gap = Math.min(0.1, 0.8 / Math.max(steps, 1))
  function leafDelay(k) {
    if (steps < 2) return 0
    if (flipped > from) return k >= from && k < flipped ? (k - from) * gap : 0
    return k >= flipped && k < from ? (from - 1 - k) * gap : 0
  }

  function renderPage(page, index, visible) {
    const tabIndex = visible ? 0 : -1
    switch (page.type) {
      case 'cover':
        return <CoverArt stats={stats} />
      case 'welcome':
        return <Welcome />
      case 'contents':
        return <Contents chapters={chapters} onJump={goToPage} tabIndex={tabIndex} />
      case 'chapter':
        return <Chapter album={page.album} />
      case 'photos':
        return <Photos page={page} index={index} onOpen={openItem} tabIndex={tabIndex} />
      case 'back':
        return <BackArt />
      default:
        return <Blank album={page.album} />
    }
  }

  const isBare = (page) => page.type === 'cover' || page.type === 'back'
  const showsNumber = (page, index) => index >= 2 && !isBare(page)

  const offset = flipped === 0 ? '-25%' : flipped === leaves ? '25%' : '0%'

  return (
    <div>
      <div
        ref={stageRef}
        className="relative w-full select-none"
        style={{ height: PAGE_H * scale + 60, opacity: box.w ? 1 : 0, touchAction: 'pan-y' }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 60) turn(dx < 0 ? 1 : -1)
        }}
      >
        <div
          className="absolute left-1/2 top-6"
          style={{
            width: PAGE_W * 2,
            height: PAGE_H,
            marginLeft: -PAGE_W,
            transform: `scale(${scale})`,
            transformOrigin: 'center top'
          }}
        >
          <div
            className="relative h-full w-full"
            style={{
              perspective: '2600px',
              transform: `translateX(${offset})`,
              transition: `transform ${turnMs}ms cubic-bezier(0.645, 0.045, 0.355, 1)`
            }}
          >
            {/* soft shadow on the table */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 rounded-[50%] bg-black/60 blur-2xl"
              style={{ width: PAGE_W * 1.7, height: 36, marginTop: -8 }}
            />

            {Array.from({ length: leaves }, (_, k) => {
              const isFlipped = k < flipped
              const live = k >= flipped - 3 && k <= flipped + 2 // only the pages near the opening render their images
              const delay = leafDelay(k)
              const front = pages[2 * k]
              const back = pages[2 * k + 1]

              return (
                <div
                  key={k}
                  className="absolute left-1/2 top-0 h-full"
                  style={{
                    width: PAGE_W,
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'left center',
                    zIndex: isFlipped ? k + 1 : leaves - k,
                    transform: `rotateY(${isFlipped ? -180 : 0}deg)`,
                    // z-index swaps halfway through the turn, when the leaf is edge-on.
                    transition: `transform ${turnMs}ms cubic-bezier(0.645, 0.045, 0.355, 1) ${delay}s, z-index 0s ${delay + turnMs / 2000}s`
                  }}
                >
                  <Face side="right" bare={isBare(front)} onClick={() => turn(1)}>
                    {live && renderPage(front, 2 * k, k === flipped)}
                    {live && showsNumber(front, 2 * k) && <PageNumber n={2 * k} dark={front.type === 'chapter'} />}
                  </Face>
                  <Face side="left" bare={isBare(back)} onClick={() => turn(-1)}>
                    {live && renderPage(back, 2 * k + 1, k === flipped - 1)}
                    {live && showsNumber(back, 2 * k + 1) && <PageNumber n={2 * k + 1} dark={back.type === 'chapter'} />}
                  </Face>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mx-auto mt-2 flex max-w-md flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => turn(-1)}
            disabled={flipped === 0}
            aria-label="Previous page"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-all hover:border-coral hover:bg-coral disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowIcon direction="left" />
          </button>
          <p className="min-w-0 truncate text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-white" aria-live="polite">
            {label}
          </p>
          <button
            type="button"
            onClick={() => turn(1)}
            disabled={flipped === leaves}
            aria-label="Next page"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-all hover:border-coral hover:bg-coral disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>

        <div className="flex gap-3 text-[11px] font-bold uppercase tracking-[0.2em]">
          <button type="button" onClick={() => goToPage(2)} className="rounded-full border border-white/20 px-4 py-2 text-white/70 transition-colors hover:border-coral hover:text-white">
            Contents
          </button>
          <button
            type="button"
            onClick={() => goTo(0)}
            disabled={flipped === 0}
            className="rounded-full border border-white/20 px-4 py-2 text-white/70 transition-colors hover:border-coral hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            Close album
          </button>
        </div>
      </div>

      {lightbox && (
        <Lightbox album={lightbox.album} index={lightbox.index} onClose={() => setLightbox(null)} onStep={stepLightbox} />
      )}
    </div>
  )
}

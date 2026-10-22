'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'
import { useAuth } from '../../../components/AuthProvider.jsx'

const RESULT_STYLE = {
  ok: { bg: 'bg-emerald-600', title: 'ENTRY OK' },
  already: { bg: 'bg-amber-500', title: 'ALREADY USED' },
  wrong_event: { bg: 'bg-amber-500', title: 'WRONG EVENT' },
  not_valid: { bg: 'bg-rose-600', title: 'NOT VALID' },
  invalid: { bg: 'bg-rose-600', title: 'UNKNOWN CODE' }
}

const SAME_CODE_COOLDOWN_MS = 4000

export default function ScanPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lastScan = useRef({ code: '', at: 0 })
  const busy = useRef(false)
  const eventIdRef = useRef('')

  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manual, setManual] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const isAdmin = user?.role === 'admin'
  eventIdRef.current = eventId

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login?next=/admin/scan')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/v1/events', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [isAdmin])

  const submit = useCallback(async (rawCode) => {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!code || busy.current) return
    const now = Date.now()
    if (lastScan.current.code === code && now - lastScan.current.at < SAME_CODE_COOLDOWN_MS) return
    lastScan.current = { code, at: now }
    busy.current = true

    try {
      const res = await fetch('/api/v1/admin/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, eventId: eventIdRef.current || undefined })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setResult(data)
      setHistory((h) => [{ ...data, code, at: new Date() }, ...h].slice(0, 15))
      if (navigator.vibrate) navigator.vibrate(data.result === 'ok' ? 80 : [120, 60, 120])
    } catch (err) {
      setResult({ result: 'error', message: err.message })
    } finally {
      busy.current = false
    }
  }, [])

  // Camera + QR decoding loop (jsQR on a canvas, so it also works on iPhones where BarcodeDetector is missing).
  useEffect(() => {
    if (!cameraOn || !isAdmin) return
    let stream
    let raf
    let stopped = false

    async function start() {
      try {
        setCameraError('')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        const video = videoRef.current
        if (!video || stopped) return
        video.srcObject = stream
        await video.play()
        tick()
      } catch (err) {
        setCameraOn(false)
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow it in the browser, or type the code below.'
            : 'Camera could not be started (it needs https or localhost). Type the code below instead.'
        )
      }
    }

    function tick() {
      if (stopped) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth
        const h = video.videoHeight
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, w, h)
        const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
        if (found?.data) submit(found.data)
      }
      raf = requestAnimationFrame(tick)
    }

    start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [cameraOn, isAdmin, submit])

  if (authLoading || !user) return <main className="min-h-screen bg-[#FFFDF9]" />
  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-6 text-center text-zinc-800">
        <div>
          <h1 className="font-display text-3xl font-black">Organisers only</h1>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-[#FF6B5B] px-6 py-3 text-sm font-bold text-white">
            Back to QPIE
          </Link>
        </div>
      </main>
    )
  }

  const style = result ? RESULT_STYLE[result.result] || RESULT_STYLE.invalid : null

  return (
    <main className="min-h-screen bg-[#FFFDF9] px-4 py-8 text-zinc-800 md:px-16">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
          <Link href="/admin" className="hover:text-[#FF6B5B]">← Dashboard</Link>
          <Link href="/admin/analytics" className="hover:text-[#FF6B5B]">Analytics</Link>
        </div>

        <h1 className="mt-4 font-display text-4xl font-black text-zinc-900">Check-in scanner</h1>

        <label className="mt-6 block text-xs font-semibold text-zinc-500" htmlFor="scan-event">
          Event gate (optional — rejects tickets for other shows)
        </label>
        <select
          id="scan-event"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium"
        >
          <option value="">Any event</option>
          {events.map((ev) => (
            <option key={ev._id} value={ev._id}>{ev.title}</option>
          ))}
        </select>

        <div className="mt-5 overflow-hidden rounded-2xl bg-zinc-900">
          {cameraOn ? (
            <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-sm text-zinc-400">Camera is off</div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <button
          onClick={() => setCameraOn((v) => !v)}
          className="mt-3 w-full rounded-xl bg-[#FF6B5B] py-3 text-sm font-bold uppercase tracking-wide text-white"
        >
          {cameraOn ? 'Stop camera' : 'Start camera'}
        </button>
        {cameraError && <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{cameraError}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            lastScan.current = { code: '', at: 0 } // a typed code is always intentional
            submit(manual)
            setManual('')
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type ticket code, e.g. QP1A2B3C4D"
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm uppercase"
          />
          <button className="rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white">Check</button>
        </form>

        {result && (
          <div
            role="status"
            aria-live="assertive"
            className={`mt-6 rounded-2xl p-6 text-white ${result.result === 'error' ? 'bg-rose-600' : style.bg}`}
          >
            <p className="font-display text-3xl font-black">{result.result === 'error' ? 'ERROR' : style.title}</p>
            {result.result === 'error' && <p className="mt-2 text-sm">{result.message}</p>}
            {result.result === 'invalid' && <p className="mt-2 text-sm">No ticket has code {result.bookingCode}.</p>}
            {result.result === 'not_valid' && (
              <p className="mt-2 text-sm">This booking is “{result.status}” — it is not a valid ticket (refunded or unpaid).</p>
            )}
            {result.eventTitle && (
              <div className="mt-3 text-sm leading-relaxed">
                <p className="text-lg font-bold">{result.eventTitle}</p>
                <p>{result.holder} · {result.seats}</p>
                <p className="font-mono">{result.bookingCode}</p>
                {result.result === 'already' && result.checkedInAt && (
                  <p className="mt-1 font-semibold">Entered at {new Date(result.checkedInAt).toLocaleTimeString('en-IN')}</p>
                )}
              </div>
            )}
            {result.stats && (
              <p className="mt-3 text-sm font-semibold">Inside: {result.stats.checkedIn} / {result.stats.total}</p>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Recent scans</h2>
            <ul className="mt-2 divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono font-semibold">{h.bookingCode || h.code}</span>
                  <span className={h.result === 'ok' ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                    {(RESULT_STYLE[h.result] || RESULT_STYLE.invalid).title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}

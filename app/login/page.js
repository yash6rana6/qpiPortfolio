'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'

const inputClass =
  'w-full border-b border-white/20 bg-transparent py-2 text-sm text-white outline-none transition-colors focus:border-white placeholder-white/40'
const labelClass =
  'block text-[10px] font-semibold tracking-[0.15em] text-white/80 uppercase mb-1'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

function LoginForm() {
  const { user, loading: authLoading, login, register, refresh } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawNext = searchParams.get('next')
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/events'
  const wantsVerify = searchParams.get('verify') === '1'

  const [mode, setMode] = useState('register')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const googleBtnRef = useRef(null)
  const emailRef = useRef(null)
  const autoSent = useRef(false)

  const typedEmail = form.email.trim()
  const knownEmail = mode === 'verify' ? (user?.email || typedEmail) : (typedEmail || user?.email || '')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const finish = useCallback(async () => {
    await refresh()
    router.push(next)
    router.refresh()
  }, [refresh, router, next])

  const sendVerifyCode = useCallback(async () => {
    try {
      await postJson('/api/v1/auth/send-otp')
      setInfo('We emailed you a 6-digit code.')
      setCooldown(30)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (authLoading || !wantsVerify || autoSent.current) return
    if (user && !user.emailVerified) {
      autoSent.current = true
      setMode('verify')
      sendVerifyCode()
    } else if (user && user.emailVerified) {
      router.replace(next)
    }
  }, [authLoading, wantsVerify, user, next, router, sendVerifyCode])

  const handleGoogle = useCallback(
    async (response) => {
      setError('')
      setBusy(true)
      try {
        await postJson('/api/v1/auth/google', { credential: response.credential })
        await finish()
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(false)
      }
    },
    [finish]
  )

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || (mode !== 'login' && mode !== 'register')) return

    function render() {
      const el = googleBtnRef.current
      if (!window.google?.accounts?.id || !el) return
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogle })
      el.innerHTML = ''
      const width = Math.min(Math.max(el.offsetWidth || 320, 200), 400)
      window.google.accounts.id.renderButton(el, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width
      })
    }

    if (window.google?.accounts?.id) {
      render()
      return
    }

    let script = document.getElementById('google-gsi')
    if (!script) {
      script = document.createElement('script')
      script.id = 'google-gsi'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      document.body.appendChild(script)
    }
    script.addEventListener('load', render)
    return () => script.removeEventListener('load', render)
  }, [mode, handleGoogle])

  function switchMode(m) {
    setMode(m)
    setError('')
    setInfo('')
    setCode('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)

    try {
      if (mode === 'login') {
        const u = await login(form.email, form.password)
        if (u && !u.emailVerified) {
          setMode('verify')
          await sendVerifyCode()
        } else {
          router.push(next)
          router.refresh()
        }
      } else if (mode === 'register') {
        await register({ name: form.name, email: form.email, phone: form.phone, password: form.password })
        setMode('verify')
        setInfo('We emailed you a 6-digit code.')
        setCooldown(30)
      } else if (mode === 'verify') {
        await postJson('/api/v1/auth/verify-email', { code })
        await finish()
      } else if (mode === 'reset') {
        await postJson('/api/v1/auth/reset-password', { email: knownEmail, code, password: form.password })
        setMode('login')
        setCode('')
        setForm((f) => ({ ...f, password: '' }))
        setInfo('Password updated. Sign in with your new password.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function startForgot() {
    setError('')
    setInfo('')

    if (!knownEmail) {
      setError('Type your registered email above first, then tap "Forgot password?".')
      emailRef.current?.focus()
      return
    }

    setBusy(true)
    try {
      await postJson('/api/v1/auth/forgot-password', { email: knownEmail })
      setForm((f) => ({ ...f, email: knownEmail, password: '' }))
      setCode('')
      setMode('reset')
      setInfo('If this email has an account, a 6-digit code is on its way.')
      setCooldown(30)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError('')
    setInfo('')
    try {
      if (mode === 'verify') {
        await sendVerifyCode()
      } else {
        await postJson('/api/v1/auth/forgot-password', { email: knownEmail })
        setInfo('A new code is on its way.')
        setCooldown(30)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const subtitle = {
    login: 'Sign in to continue your journey.',
    register: 'Sign Up now to get 20% off your next order.',
    verify: `Enter the 6-digit code we sent to ${knownEmail || 'your email'}.`,
    reset: `Enter the code sent to ${knownEmail} and choose a new password.`
  }[mode]

  const submitLabel = {
    login: 'Sign In',
    register: 'Sign Up',
    verify: 'Verify email',
    reset: 'Update password'
  }[mode]

  const showGoogle = GOOGLE_CLIENT_ID && (mode === 'login' || mode === 'register')
  const showCode = mode === 'verify' || mode === 'reset'
  const showEmailField = mode === 'login' || mode === 'register'

  return (
    <main className="relative flex min-h-screen w-full items-center justify-end bg-[#0d060e] p-4 lg:p-8">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/signupForm.png')` }}
      />

      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-transparent to-[#150711]/50" />

      <div className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] backdrop-blur-2xl lg:mr-12 lg:p-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 flex flex-wrap items-center justify-center gap-1.5 font-serif text-3xl leading-none text-white lg:text-4xl">
            {mode === 'verify' ? (
              'Verify your email'
            ) : mode === 'reset' ? (
              'Reset password'
            ) : (
              <>
                <span>Welcome to</span>
                <img
                  src="/logo.svg"
                  alt="QPIE"
                  className="h-9 w-auto translate-y-[1px] object-contain lg:h-11"
                />
              </>
            )}
          </h1>
          <p className="text-xs text-white/80">{subtitle}</p>
        </div>

        {showGoogle && (
          <div className="mb-5">
            <div ref={googleBtnRef} className="flex min-h-[44px] justify-center" />
            <div className="mt-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-white/40">
              <span className="h-px flex-1 bg-white/15" />
              or with email
              <span className="h-px flex-1 bg-white/15" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className={labelClass}>
                Username
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
                className={inputClass}
                placeholder="Enter your username"
              />
            </div>
          )}

          {showEmailField && (
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required={mode === 'register' || mode === 'login'}
                autoComplete="email"
                className={inputClass}
                placeholder="Enter your email"
              />
            </div>
          )}

          {showCode && (
            <div>
              <label htmlFor="code" className={labelClass}>
                6-digit code
              </label>
              <input
                id="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
                className={`${inputClass} text-center text-xl tracking-[0.5em]`}
                placeholder="------"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div>
              <label htmlFor="password" className={labelClass}>
                {mode === 'login' ? 'Password' : mode === 'reset' ? 'New Password' : 'Create Password'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={inputClass}
                  placeholder="Enter your password"
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer text-white/40 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {info && (
            <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100 backdrop-blur-md">
              {info}
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-xs text-red-200 backdrop-blur-md">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-[#ff8166] to-[#fc3e70] py-3 text-xs font-bold tracking-wider text-white uppercase shadow-[0_0_15px_rgba(252,62,112,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(252,62,112,0.5)] disabled:opacity-50"
          >
            {busy ? 'Working…' : submitLabel}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          {showCode && (
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0}
              className="block w-full text-[11px] text-white/60 transition-colors hover:text-white disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          )}

          {mode === 'login' && (
            <button
              type="button"
              onClick={startForgot}
              disabled={busy}
              className="block w-full text-[11px] text-white/60 transition-colors hover:text-white disabled:opacity-50"
            >
              Forgot password?
            </button>
          )}

          {(mode === 'login' || mode === 'register') && (
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-[11px] text-white/60 transition-colors hover:text-white"
            >
              {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-[11px] text-white/60 transition-colors hover:text-white"
            >
              Back to sign in
            </button>
          )}

          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/80"
            >
              <span>← Back to</span>
              <img src="/logo.svg" alt="QPIE" className="h-4 w-auto translate-y-[0.5px] object-contain opacity-60" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0d060e]" />}>
      <LoginForm />
    </Suspense>
  )
}
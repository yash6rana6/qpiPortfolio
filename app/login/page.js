'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/30 outline-none transition-colors focus:border-coral'

function LoginForm() {
  const { login, register } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/bookshow'

  const [mode, setMode] = useState('login') // login | register
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register({ name: form.name, email: form.email, phone: form.phone, password: form.password })
      }
      router.push(next)
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-6 py-20 text-ink">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-ink/50 transition-colors hover:text-ink">
          ← Back to QPIE
        </Link>

        <h1 className="mt-8 font-display text-4xl font-black leading-tight tracking-tight">
          {mode === 'login' ? 'Sign in to book' : 'Create your QPIE account'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/50">
          {mode === 'login'
            ? 'Your tickets and booking history live here.'
            : 'One account for every show you book with us.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm text-ink/60">Full name</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
                className={inputClass}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm text-ink/60">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm text-ink/60">
                Phone <span className="text-ink/30">(optional)</span>
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
                className={inputClass}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm text-ink/60">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
            />
            {mode === 'register' && (
              <p className="text-xs text-ink/40">At least 8 characters.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-coral py-3.5 text-sm font-semibold text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
          className="mt-6 w-full text-sm text-ink/50 transition-colors hover:text-ink"
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-sand" />}>
      <LoginForm />
    </Suspense>
  )
}

'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'

const inputClass =
  'w-full border-b border-white/20 bg-transparent py-2 text-sm text-white outline-none transition-colors focus:border-white placeholder-white/40'
const labelClass = 
  'block text-[10px] font-semibold tracking-[0.15em] text-white/80 uppercase mb-1'

function LoginForm() {
  const { login, register } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/events'

  const [mode, setMode] = useState('register') 
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
    // Form right side pe hai (justify-end)
    <main className="relative flex min-h-screen w-full items-center justify-end bg-[#0d060e] p-4 lg:p-8">
      
      {/* Full Screen Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/signupForm.png')` }}
      />
      
      {/* Right side pe halka sa dark gradient for readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-transparent to-[#150711]/50" />

      {/* Glassmorphism Card - Chota size (max-w-md) */}
      <div className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] backdrop-blur-2xl lg:mr-12 lg:p-8">
        
        {/* Header Text - Name changed to QPIE */}
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl leading-tight text-white mb-2 lg:text-4xl">
            Welcome to QPIE
          </h1>
          <p className="text-xs text-white/80">
            {mode === 'login' 
              ? 'Sign in to continue your journey.' 
              : 'Sign Up now to get 20% off your next order.'}
          </p>
        </div>

        {/* Form - Reduced spacing */}
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

          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              {mode === 'login' ? 'Password' : 'Create Password'}
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
              {/* Eye Icon */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer text-white/40 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
            </div>
          </div>

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
            {busy ? 'Working…' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
            className="text-[11px] text-white/60 transition-colors hover:text-white"
          >
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
          
          <div className="block">
            <Link href="/" className="text-[11px] text-white/40 transition-colors hover:text-white/80">
              ← Back to QPIE
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
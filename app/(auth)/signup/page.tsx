'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signupSchema } from '@/lib/validations/auth'
import { ZodError } from 'zod'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [password, setPassword] = useState('')

  const requirements = [
    { label: 'MIN_8_CHARACTERS', test: (pw: string) => pw.length >= 8 },
    { label: 'UPPERCASE_LETTER', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'LOWERCASE_LETTER', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'NUMERIC_DIGIT', test: (pw: string) => /[0-9]/.test(pw) },
    { label: 'SPECIAL_CHARACTER', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
  ]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error')
    if (oauthError) {
      queueMicrotask(() => setError(oauthError))
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    if (googleLoading) return
    setLoading(true)
    setError(null)

    try {
      // Client-side validation
      const data = Object.fromEntries(formData.entries())
      signupSchema.parse(data)
    } catch (err) {
      if (err instanceof ZodError) {
        setError(err.issues[0].message)
      } else {
        setError('An unexpected error occurred')
      }
      setLoading(false)
      return
    }

    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    if (loading) return
    setGoogleLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        setGoogleLoading(false)
      }
    } catch {
      setError('An unexpected error occurred during Google sign up')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-8 sm:p-10 shadow-2xl relative select-none">
      {/* Header */}
      <div className="mb-8 text-left">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-3">
          Get Started
        </span>
        <h1 className="font-sans text-3xl font-black text-foreground tracking-tight">
          Create Account
        </h1>
        <p className="font-sans text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Set up your Crenelle organizer profile to launch events in minutes.
        </p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="border-l-2 border-red-500 bg-red-500/10 px-4 py-3 rounded-r-xl font-sans text-xs text-red-400 leading-relaxed"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-email"
            className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80"
          >
            Email Address
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="w-full bg-stone-400/30 dark:bg-stone-900/50 border border-border/40 text-foreground font-sans text-sm px-4 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:border-copper focus:ring-2 focus:ring-copper/20 transition-all rounded-xl shadow-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-password"
            className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80"
          >
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full bg-stone-400/30 dark:bg-stone-900/50 border border-border/40 text-foreground font-sans text-sm px-4 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:border-copper focus:ring-2 focus:ring-copper/20 transition-all rounded-xl shadow-xs"
          />

          {/* Password Requirements Checklist */}
          {password && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 bg-stone-100/60 p-3.5 border border-border/30 rounded-xl">
              {requirements.map((req) => {
                const isMet = req.test(password)
                return (
                  <div
                    key={req.label}
                    className={cn(
                      "flex items-center gap-2 font-mono text-[9px] font-bold tracking-wider transition-colors",
                      isMet ? "text-emerald-400" : "text-muted-foreground/40"
                    )}
                  >
                    <div className={cn(
                      "size-3 rounded-full border flex items-center justify-center shrink-0",
                      isMet ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-border/40"
                    )}>
                      {isMet && <Check className="size-2" strokeWidth={3} />}
                    </div>
                    {req.label.replace('_', ' ')}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-confirm"
            className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80"
          >
            Confirm Password
          </label>
          <input
            id="signup-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            className="w-full bg-stone-900/30 dark:bg-stone-900/50 border border-border/40 text-foreground font-sans text-sm px-4 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:border-copper focus:ring-2 focus:ring-copper/20 transition-all rounded-xl shadow-xs"
          />
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="mt-3 w-full bg-copper hover:bg-copper-dark text-white font-sans text-xs font-bold px-6 py-3.5 rounded-full transition-all duration-300 shadow-md shadow-copper/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Creating...' : 'Create Account →'}
        </button>
      </form>

      <div className="relative flex py-5 items-center">
        <div className="grow border-t border-border/30"></div>
        <span className="shrink mx-4 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Or</span>
        <div className="grow border-t border-border/30"></div>
      </div>

      <Button
        type="button"
        variant="glass"
        onClick={handleGoogleLogin}
        disabled={loading || googleLoading}
        className="w-full h-11 font-sans text-xs font-bold tracking-tight flex items-center justify-center gap-3 rounded-full border border-border/40 hover:border-copper/40"
      >
        {googleLoading ? (
          'Connecting...'
        ) : (
          <>
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </>
        )}
      </Button>

      <p className="font-sans text-xs text-muted-foreground mt-6 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-copper font-bold hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  )
}


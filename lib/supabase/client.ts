import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock:
          typeof window !== 'undefined'
            ? async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => await fn()
            : undefined,
      },
    }
  )
}


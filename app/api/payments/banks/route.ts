import { NextResponse } from 'next/server'
import { listBanks } from '@/lib/paystack'

// Cache the bank list for 1 hour — rarely changes
let bankCache: { data: Awaited<ReturnType<typeof listBanks>>['data']; cachedAt: number } | null =
  null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * GET /api/payments/banks
 *
 * Returns the list of Nigerian banks supported by Paystack.
 * Cached for 1 hour in-process to avoid hammering the Paystack API.
 * No auth required — bank names are public data.
 */
export async function GET() {
  // Serve from cache if fresh
  if (bankCache && Date.now() - bankCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ banks: bankCache.data }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    })
  }

  const { data, error } = await listBanks()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to load banks. Please try again.' }, { status: 502 })
  }

  // Filter to active NUBAN banks only (Nigerian standard account format)
  const filtered = data
    .filter((b) => b.active && b.type === 'nuban')
    .sort((a, b) => a.name.localeCompare(b.name))

  // Update cache
  bankCache = { data: filtered, cachedAt: Date.now() }

  return NextResponse.json({ banks: filtered }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  })
}

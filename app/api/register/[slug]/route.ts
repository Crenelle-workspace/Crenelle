import { NextRequest, NextResponse } from 'next/server'
import { getRegisterEvent } from '@/lib/register-event'

export const dynamic = 'force-dynamic'

/**
 * Public API route to fetch event details by registration slug.
 * No auth required — this powers the public registration page.
 *
 * The data-fetching logic lives in `getRegisterEvent` so the server-rendered
 * `/register/[slug]` page and this route return identical payloads.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const result = await getRegisterEvent(slug)

  if (result.error) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json(result.event)
}

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

/**
 * GET /api/qr/[token]
 *
 * Self-hosted endpoint for rendering dynamic QR code PNG images.
 * Eliminates reliance on external third-party services (e.g. qrserver.com).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Only render QR codes for values that look like our own tokens
  // (invitations.qr_token = 32 hex chars; UUID fallback also matches). This
  // prevents the endpoint being abused as an open QR renderer for arbitrary
  // attacker-supplied data — e.g. encoding a phishing/malware URL into a QR
  // served from this trusted origin. URLs, whitespace and scripts are rejected.
  if (!token || !/^[A-Za-z0-9_-]{8,128}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid QR token' }, { status: 400 })
  }

  try {
    const pngBuffer = await QRCode.toBuffer(token, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#0A0A0A',
        light: '#F0EDE8',
      },
      errorCorrectionLevel: 'M',
    })

    return new Response(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[qr] Error generating QR code PNG:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}

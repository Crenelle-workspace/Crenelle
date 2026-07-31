import crypto from 'crypto'

/**
 * Resolve the HMAC secret used to sign ephemeral search handles.
 *
 * SECURITY: there is deliberately NO hardcoded fallback. A checked-in default
 * secret means anyone who has read the source can forge valid tokens (and thus
 * pull any guest's details out of the scan endpoint). If no secret is
 * configured we fail closed — token creation and verification both throw,
 * which surfaces the misconfiguration instead of silently accepting forgeries.
 *
 * Prefer a dedicated secret (EPHEMERAL_TOKEN_SECRET); fall back to the
 * service-role key only because it is guaranteed high-entropy and present in
 * every deployment. Resolved lazily so importing this module never throws at
 * build time.
 */
function getSecret(): string {
  const secret =
    process.env.EPHEMERAL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error(
      'Ephemeral token secret is not configured: set EPHEMERAL_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  return secret
}

// Full SHA-256 HMAC — 64 hex chars / 256 bits. Never truncated: a shortened
// signature only shrinks the forgery search space with no upside.
function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Generates a signed 15-minute ephemeral handle for manual usher search results.
 * Format: `eph_${invitationId}_${expiresAt}_${signature}`
 */
export function createEphemeralSearchToken(invitationId: string, scannerToken: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS
  const payload = `${invitationId}:${scannerToken}:${expiresAt}`
  const signature = sign(payload)
  return `eph_${invitationId}_${expiresAt}_${signature}`
}

/**
 * Verifies an ephemeral search handle and extracts the target invitation ID.
 * Returns invitationId if signature is valid and timestamp has not expired; otherwise null.
 */
export function verifyEphemeralSearchToken(token: string, scannerToken: string): string | null {
  if (!token || !token.startsWith('eph_')) return null

  // Split from the right: the signature is a fixed hex blob with no underscores
  // and the trailing timestamp is all digits, so this stays correct even if a
  // future invitationId ever contained an underscore.
  const rest = token.slice(4)
  const lastUnderscore = rest.lastIndexOf('_')
  if (lastUnderscore <= 0) return null
  const signature = rest.slice(lastUnderscore + 1)
  const beforeSig = rest.slice(0, lastUnderscore)
  const secondUnderscore = beforeSig.lastIndexOf('_')
  if (secondUnderscore <= 0) return null
  const invitationId = beforeSig.slice(0, secondUnderscore)
  const expiresAtStr = beforeSig.slice(secondUnderscore + 1)

  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || Date.now() > expiresAt) return null

  const expectedPayload = `${invitationId}:${scannerToken}:${expiresAt}`
  const expectedSig = sign(expectedPayload)

  try {
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSig)
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return invitationId
    }
  } catch {
    return null
  }
  return null
}

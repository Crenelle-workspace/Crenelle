import crypto from 'crypto'

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'crenelle_search_token_secret_key'

/**
 * Generates a signed 15-minute ephemeral handle for manual usher search results.
 * Format: `eph_${invitationId}_${expiresAt}_${signature}`
 */
export function createEphemeralSearchToken(invitationId: string, scannerToken: string): string {
  const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes validity
  const payload = `${invitationId}:${scannerToken}:${expiresAt}`
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16)
  return `eph_${invitationId}_${expiresAt}_${signature}`
}

/**
 * Verifies an ephemeral search handle and extracts the target invitation ID.
 * Returns invitationId if signature is valid and timestamp has not expired; otherwise null.
 */
export function verifyEphemeralSearchToken(token: string, scannerToken: string): string | null {
  if (!token || !token.startsWith('eph_')) return null
  const parts = token.slice(4).split('_')
  if (parts.length !== 3) return null

  const [invitationId, expiresAtStr, signature] = parts
  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || Date.now() > expiresAt) return null

  const expectedPayload = `${invitationId}:${scannerToken}:${expiresAt}`
  const expectedSig = crypto.createHmac('sha256', SECRET).update(expectedPayload).digest('hex').slice(0, 16)

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

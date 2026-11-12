/**
 * Zoho CPaaS (ZeptoMail transactional email engine) REST client.
 *
 * Uses native `fetch` with explicit timeouts, normalized auth/base URLs,
 * and bounded retries for transient 429/5xx responses.
 */

const ZOHO_CPAAS_DEFAULT_BASE_URL = 'https://cpaas.zoho.com'
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_RETRIES = 2
const MAX_RETRY_DELAY_MS = 5_000

export interface ZohoEmailAddress {
  address: string
  name?: string
}

export interface ZohoInlineImage {
  cid: string
  name: string
  content: string
  mime_type: string
}

export interface ZohoSendEmailPayload {
  from: ZohoEmailAddress
  to: Array<{ email_address: ZohoEmailAddress }>
  reply_to?: ZohoEmailAddress[]
  subject: string
  htmlbody: string
  client_reference?: string
  mime_headers?: Record<string, string>
  inline_images?: ZohoInlineImage[]
}

export interface ZohoSendEmailResult {
  requestId: string | null
  error?: string
}

/** Resolves the Zoho CPaaS origin URL, stripping trailing slashes or accidental path suffixes. */
export function getZohoBaseUrl(): string {
  const raw = (process.env.ZOHO_CPAAS_BASE_URL ?? '').trim() || ZOHO_CPAAS_DEFAULT_BASE_URL
  return raw.replace(/\/+$/, '').replace(/\/v1\.1\/email$/i, '')
}

/** Normalizes `ZOHO_CPAAS_API_KEY` into the required `Zoho-enczapikey <token>` header value. */
export function getZohoAuthHeader(): string | null {
  const raw = (process.env.ZOHO_CPAAS_API_KEY ?? '').trim().replace(/^authorization:\s*/i, '').trim()
  if (!raw) return null
  if (/^zoho-enczapikey\s+/i.test(raw)) {
    const token = raw.replace(/^zoho-enczapikey\s+/i, '').trim()
    return token ? `Zoho-enczapikey ${token}` : null
  }
  return `Zoho-enczapikey ${raw}`
}

function parseJsonSafe(rawText: string): Record<string, unknown> | null {
  if (!rawText) return null
  try {
    const parsed: unknown = JSON.parse(rawText)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function extractZohoErrorMessage(status: number, rawText: string, parsed: Record<string, unknown> | null): string {
  if (parsed) {
    const errObj = parsed.error as { code?: string; message?: string; details?: Array<{ message?: string }> } | undefined
    if (errObj && typeof errObj === 'object') {
      const detailMsg = Array.isArray(errObj.details)
        ? errObj.details.map(d => d?.message).filter(Boolean).join('; ')
        : ''
      const baseMsg = errObj.message || errObj.code || `Zoho CPaaS error (${status})`
      return detailMsg ? `${baseMsg}: ${detailMsg}` : baseMsg
    }
    if (typeof parsed.message === 'string' && parsed.message) {
      return parsed.message
    }
  }
  const snippet = rawText.trim().slice(0, 200)
  return snippet ? `Zoho CPaaS HTTP ${status}: ${snippet}` : `Zoho CPaaS HTTP ${status}`
}

function computeRetryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader)
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS)
    }
  }
  return Math.min(300 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

/**
 * Dispatches a single transactional email via Zoho CPaaS `POST /v1.1/email`.
 * Retries transient 429 and 5xx failures; fails immediately on 4xx client errors.
 */
export async function sendZohoEmail(
  payload: ZohoSendEmailPayload,
  options: { maxRetries?: number; timeoutMs?: number } = {}
): Promise<ZohoSendEmailResult> {
  const authHeader = getZohoAuthHeader()
  if (!authHeader) {
    return { requestId: null, error: 'ZOHO_CPAAS_API_KEY is not configured' }
  }

  const endpoint = `${getZohoBaseUrl()}/v1.1/email`
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      })

      const rawText = await response.text()
      const parsed = parseJsonSafe(rawText)

      if (response.ok) {
        const requestId = typeof parsed?.request_id === 'string' ? parsed.request_id : null
        return { requestId }
      }

      const errorMsg = extractZohoErrorMessage(response.status, rawText, parsed)
      const isRetryable = response.status === 429 || response.status >= 500
      if (!isRetryable || attempt >= maxRetries) {
        return { requestId: null, error: errorMsg }
      }

      const delayMs = computeRetryDelayMs(attempt, response.headers.get('retry-after'))
      await new Promise(resolve => setTimeout(resolve, delayMs))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error sending Zoho email'
      if (attempt >= maxRetries) {
        return { requestId: null, error: message }
      }
      const delayMs = computeRetryDelayMs(attempt, null)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return { requestId: null, error: 'Failed to send email via Zoho CPaaS' }
}


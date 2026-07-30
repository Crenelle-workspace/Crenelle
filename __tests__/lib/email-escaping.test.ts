import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture the payload passed to Resend's send() so we can assert on the
// rendered HTML without hitting the network.
const sendMock = vi.fn(async () => ({ data: { id: 'msg_test' }, error: null }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

// The co-host builder does not touch Supabase, but the module imports the
// admin client at load time — stub it so import succeeds.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { escapeHtml, safeImageUrl, sendCoHostInviteEmail } from '@/lib/email'

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<script>alert('x')&"</script>`)).toBe(
      '&lt;script&gt;alert(&#39;x&#39;)&amp;&quot;&lt;/script&gt;'
    )
  })

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('escapes ampersand first so entities are not double-broken', () => {
    // A raw "&lt;" typed by a user must become "&amp;lt;", not "&lt;".
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})

describe('safeImageUrl', () => {
  it('allows http and https URLs (attribute-escaped)', () => {
    expect(safeImageUrl('https://cdn.example.com/banner.png')).toBe(
      'https://cdn.example.com/banner.png'
    )
    expect(safeImageUrl('http://example.com/b.jpg')).toBe('http://example.com/b.jpg')
  })

  it('rejects javascript: and data: URLs', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBe('')
    expect(safeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(safeImageUrl('  JavaScript:alert(1)')).toBe('')
  })

  it('attribute-escapes a URL that tries to break out of the src attribute', () => {
    const payload = 'https://x/"><img src=x onerror=alert(1)>'
    const out = safeImageUrl(payload)
    expect(out).not.toContain('"')
    expect(out).not.toContain('<')
    expect(out).toContain('&quot;')
    expect(out).toContain('&lt;')
  })

  it('returns empty string for non-http schemes and blank input', () => {
    expect(safeImageUrl('ftp://example.com/x.png')).toBe('')
    expect(safeImageUrl('')).toBe('')
    expect(safeImageUrl(null)).toBe('')
  })
})

describe('sendCoHostInviteEmail — stored-XSS prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendMock.mockResolvedValue({ data: { id: 'msg_test' }, error: null })
  })

  it('HTML-escapes user-controlled fields in the email body', async () => {
    await sendCoHostInviteEmail({
      inviteeEmail: 'invitee@example.com',
      inviteeName: 'Invitee',
      inviterName: `<img src=x onerror=alert('inviter')>`,
      inviterEmail: 'host@example.com',
      eventName: `<script>alert('evt')</script>`,
      eventDate: '2026-08-01',
      eventId: 'evt-1',
      role: 'viewer',
    })

    expect(sendMock).toHaveBeenCalledTimes(1)
    const { html, subject } = (sendMock.mock.calls as unknown as [{ html: string; subject: string }][])[0][0]

    // The raw payloads must NOT appear verbatim in the rendered HTML.
    expect(html).not.toContain('<script>alert(\'evt\')</script>')
    expect(html).not.toContain('<img src=x onerror=alert(\'inviter\')>')

    // Their escaped forms must be present instead.
    expect(html).toContain('&lt;script&gt;alert(&#39;evt&#39;)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(&#39;inviter&#39;)&gt;')

    // The subject is an email header, not HTML — it stays raw.
    expect(subject).toBe(`You've been invited to co-host "<script>alert('evt')</script>"`)
  })
})

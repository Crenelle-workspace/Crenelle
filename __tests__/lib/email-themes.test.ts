import { describe, it, expect } from 'vitest'
import { renderTicketEmail } from '@/lib/email-templates'
import { renderClassicTheme } from '@/lib/email-templates/classic'

describe('Email Theme Architecture (Phase 1)', () => {
  const mockOptions = {
    emailType: 'invitation' as const,
    event: {
      name: 'Tech Summit 2026',
      date: '2026-08-15',
      time: '14:00:00',
      venue: 'Main Auditorium',
      banner_url: null,
      email_theme: 'classic',
    },
    recipientName: 'Alice Johnson',
    partySizeText: '1 PERSON',
    eventDateFormatted: 'Saturday, 15 August 2026',
    timeFormatted: '2:00 PM',
    seatHtml: '',
    tierHtml: '',
    unsubscribeUrl: 'https://crenelle.org/api/unsubscribe?token=abc',
  }

  it('routes to classic theme by default when email_theme is undefined', () => {
    const htmlDefault = renderTicketEmail({ ...mockOptions, theme: undefined, event: { ...mockOptions.event, email_theme: undefined } })
    const htmlClassic = renderClassicTheme(mockOptions)
    expect(htmlDefault).toBe(htmlClassic)
  })

  it('routes to classic theme when classic is explicitly selected', () => {
    const htmlRouted = renderTicketEmail({ ...mockOptions, theme: 'classic' })
    const htmlClassic = renderClassicTheme(mockOptions)
    expect(htmlRouted).toBe(htmlClassic)
  })

  it('renders invitation details correctly in classic theme', () => {
    const html = renderTicketEmail(mockOptions)
    expect(html).toContain('CONFIRMED ENTRY PASS')
    expect(html).toContain('Tech Summit 2026')
    expect(html).toContain('Alice Johnson')
    expect(html).toContain('Main Auditorium')
    expect(html).toContain('1 PERSON')
    expect(html).toContain('cid:qrcode')
  })

  it('renders reminder details and custom message correctly', () => {
    const reminderHtml = renderTicketEmail({
      ...mockOptions,
      emailType: 'reminder',
      customMessage: 'Please arrive 15 minutes early.',
    })
    expect(reminderHtml).toContain('EVENT REMINDER & PASS')
    expect(reminderHtml).toContain('Please arrive 15 minutes early.')
    expect(reminderHtml).toContain('YOUR ENTRY PASS')
  })

  it('escapes HTML characters in user input to prevent stored XSS', () => {
    const unsafeHtml = renderTicketEmail({
      ...mockOptions,
      event: {
        ...mockOptions.event,
        name: '<script>alert("hack")</script>',
        venue: 'Room <1>&"2"',
      },
      recipientName: '<img src=x onerror=alert(1)>',
    })
    expect(unsafeHtml).not.toContain('<script>alert("hack")</script>')
    expect(unsafeHtml).not.toContain('<img src=x onerror=alert(1)>')
    expect(unsafeHtml).toContain('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;')
    expect(unsafeHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('renders boarding pass theme with flight grid layout and stub divider', () => {
    const bpOptions = {
      ...mockOptions,
      theme: 'boarding_pass',
      qrToken: 'CRN-ABC1234567',
      seatInfo: 'Row A Seat 12',
      tierName: 'VIP First Class',
      tierPerks: ['Priority Entry', 'Free Drinks'],
    }
    const html = renderTicketEmail(bpOptions)
    expect(html).toContain('CRENELLE AIRWAYS')
    expect(html).toContain('BOARDING PASS')
    expect(html).toContain('Row A Seat 12')
    expect(html).toContain('CRNABC1234')
    expect(html).toContain('BOARDING PASS STUB')
    expect(html).not.toContain('<script>')
  })

  it('renders minimal mono theme with architectural hairline grid layout', () => {
    const html = renderTicketEmail({ ...mockOptions, theme: 'minimal_mono' })
    expect(html).toContain('CRENELLE / ARCHIVE')
    expect(html).toContain('Tech Summit 2026')
    expect(html).toContain('DIGITAL VALIDATION')
  })

  it('renders luxe dark theme with gold metallic framing', () => {
    const html = renderTicketEmail({ ...mockOptions, theme: 'luxe_dark', tierName: 'Gala VIP' })
    expect(html).toContain('EXCLUSIVE INVITATION')
    expect(html).toContain('HONORED GUEST')
    expect(html).toContain('#D4AF37')
  })

  it('renders bold poster theme with neo-brutalist header banner', () => {
    const html = renderTicketEmail({ ...mockOptions, theme: 'bold_poster' })
    expect(html).toContain('CRENELLE FESTIVAL PASS')
    expect(html).toContain('ADMIT ONE')
    expect(html).toContain('#4F46E5')
  })
})

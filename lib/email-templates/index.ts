import { renderClassicTheme } from './classic'
import { renderBoardingPassTheme } from './boarding-pass'
import { renderMinimalMonoTheme } from './minimal-mono'
import { renderLuxeDarkTheme } from './luxe-dark'
import { renderBoldPosterTheme } from './bold-poster'

export interface RenderTicketEmailOptions {
  theme?: string | null
  emailType: 'invitation' | 'reminder'
  event: {
    name: string
    date: string
    time: string | null
    venue: string
    banner_url?: string | null
    email_theme?: string | null
  }
  recipientName: string
  partySizeText: string
  eventDateFormatted: string
  timeFormatted: string
  seatHtml: string
  tierHtml: string
  unsubscribeUrl: string
  customMessage?: string
  qrCidOrSrc?: string
  qrToken?: string
  seatInfo?: string | null
  tierName?: string | null
  tierPerks?: string[]
}

/**
 * Main template dispatcher for Crenelle ticket & reminder emails.
 * Dispatches to the appropriate theme renderer based on event.email_theme or theme option.
 * Defaults to 'classic'.
 */
export function renderTicketEmail(options: RenderTicketEmailOptions): string {
  const selectedTheme = options.theme || options.event.email_theme || 'classic'

  switch (selectedTheme) {
    case 'boarding_pass':
      return renderBoardingPassTheme(options)
    case 'minimal_mono':
      return renderMinimalMonoTheme(options)
    case 'luxe_dark':
      return renderLuxeDarkTheme(options)
    case 'bold_poster':
      return renderBoldPosterTheme(options)
    case 'classic':
    default:
      return renderClassicTheme(options)
  }
}

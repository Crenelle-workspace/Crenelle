import { escapeHtml, safeImageUrl } from '@/lib/email'
import { getOptimizedBannerUrl } from '@/lib/images'
import type { RenderOptions } from './classic'

export function renderBoardingPassTheme(options: RenderOptions & {
  qrToken?: string
  seatInfo?: string | null
  tierName?: string | null
  tierPerks?: string[]
}): string {
  const {
    emailType,
    event,
    recipientName,
    partySizeText,
    eventDateFormatted,
    timeFormatted,
    unsubscribeUrl,
    customMessage,
    qrCidOrSrc = 'cid:qrcode',
    qrToken,
    seatInfo,
    tierName,
    tierPerks = [],
  } = options

  const isReminder = emailType === 'reminder'
  const titleText = isReminder ? 'EVENT REMINDER PASS' : 'BOARDING PASS'
  const subtitleText = isReminder ? 'REMINDER / CONFIRMED' : 'CONFIRMED PASSENGER'

  const passCode = qrToken
    ? qrToken.replace(/-/g, '').slice(0, 10).toUpperCase()
    : 'CRN-' + Math.random().toString(36).substring(2, 8).toUpperCase()

  const gateZone = seatInfo || tierName || 'MAIN GATE'
  const seatDisplay = seatInfo || partySizeText

  const perksText = tierPerks.length > 0
    ? tierPerks.map(p => escapeHtml(p)).join(' • ')
    : 'STANDARD ENTRY'

  const bannerHtml = (event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))) ? `
    <!-- Banner Image -->
    <div style="margin-bottom:20px;border-radius:4px;overflow:hidden;border:1px solid #CBD5E1;">
      <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)} Banner" style="width:100%;height:auto;display:block;border:none;" />
    </div>` : ''

  const customMessageHtml = customMessage ? `
    <!-- Custom message callout -->
    <div class="msg-box" style="background-color:#F1F5F9;border-left:4px solid #0284C7;padding:14px;margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.5;color:#1E293B;">
      <strong style="color:#0284C7;display:block;margin-bottom:4px;font-size:11px;letter-spacing:1px;">ORGANIZER MESSAGE:</strong>
      ${escapeHtml(customMessage)}
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    @media (prefers-color-scheme: dark) {
      .bg-body {
        background-color: #0F172A !important;
      }
      .bg-card {
        background-color: #1E293B !important;
        border-color: #334155 !important;
      }
      .bg-header {
        background-color: #0F172A !important;
      }
      .text-heading {
        color: #F8FAFC !important;
      }
      .text-body {
        color: #E2E8F0 !important;
      }
      .text-muted {
        color: #94A3B8 !important;
      }
      .stub-bg {
        background-color: #0F172A !important;
      }
      .msg-box {
        background-color: #1E293B !important;
        color: #E2E8F0 !important;
      }
    }
  </style>
</head>
<body class="bg-body" style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Courier New',Courier,monospace;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:30px 16px;">
    
    <!-- Main Boarding Pass Ticket Container -->
    <div class="bg-card" style="background-color:#FFFFFF;border:2px solid #0F172A;border-radius:8px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
      
      <!-- Airline Header Band -->
      <table class="bg-header" style="width:100%;border-collapse:collapse;background-color:#0F172A;padding:16px 24px;">
        <tr>
          <td style="padding:16px 24px;">
            <span style="font-size:12px;font-weight:700;letter-spacing:3px;color:#38BDF8;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">CRENELLE AIRWAYS</span>
            <span style="display:block;font-size:9px;letter-spacing:1.5px;color:#94A3B8;margin-top:2px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TICKET & ENTRY SYSTEM</span>
          </td>
          <td style="padding:16px 24px;text-align:right;">
            <span style="display:inline-block;padding:4px 10px;background-color:#0284C7;color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:2px;border-radius:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${titleText}</span>
          </td>
        </tr>
      </table>

      <!-- Ticket Content Body -->
      <div style="padding:24px;">
        
        ${bannerHtml}
        ${customMessageHtml}

        <!-- Event Name & Passenger Header -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="vertical-align:top;">
              <span class="text-muted" style="font-size:9px;letter-spacing:2px;color:#64748B;text-transform:uppercase;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">EVENT / DESTINATION</span>
              <h1 class="text-heading" style="font-size:24px;line-height:1.2;font-weight:800;color:#0F172A;margin:4px 0 0 0;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${escapeHtml(event.name)}
              </h1>
            </td>
          </tr>
        </table>

        <!-- Grid of Flight Info Fields -->
        <table style="width:100%;border-collapse:collapse;background-color:rgba(241,245,249,0.5);border:1px solid #E2E8F0;border-radius:4px;margin-bottom:20px;">
          <tr>
            <td style="padding:12px 16px;width:50%;border-bottom:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
              <span class="text-muted" style="font-size:9px;letter-spacing:2px;color:#64748B;text-transform:uppercase;display:block;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">PASSENGER / GUEST</span>
              <span class="text-heading" style="font-size:14px;font-weight:700;color:#0F172A;display:block;margin-top:2px;font-family:'Courier New',Courier,monospace;">${escapeHtml(recipientName)}</span>
            </td>
            <td style="padding:12px 16px;width:50%;border-bottom:1px solid #E2E8F0;">
              <span class="text-muted" style="font-size:9px;letter-spacing:2px;color:#64748B;text-transform:uppercase;display:block;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">PASS REF CODE</span>
              <span style="font-size:14px;font-weight:700;color:#0284C7;display:block;margin-top:2px;font-family:'Courier New',Courier,monospace;">${passCode}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;width:50%;border-bottom:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
              <span class="text-muted" style="font-size:9px;letter-spacing:2px;color:#64748B;text-transform:uppercase;display:block;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">DATE</span>
              <span class="text-heading" style="font-size:13px;font-weight:600;color:#0F172A;display:block;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${eventDateFormatted}</span>
            </td>
            <td style="padding:12px 16px;width:50%;border-bottom:1px solid #E2E8F0;">
              <span class="text-muted" style="font-size:9px;letter-spacing:2px;color:#64748B;text-transform:uppercase;display:block;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">BOARDING TIME</span>
              <span class="text-heading" style="font-size:13px;font-weight:600;color:#0F172A;display:block;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${timeFormatted || 'TBA'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;width:50%;border-right:1px solid #E2E8F0;">
              <span class="text-muted" style="font-size:9px;letter-spacing:2px;color:#64748B;text-transform:uppercase;display:block;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">GATE / ZONE</span>
              <span class="text-heading" style="font-size:13px;font-weight:600;color:#0F172A;display:block;margin-top:2px;font-family:'Courier New',Courier,monospace;">${escapeHtml(gateZone)}</span>
            </td>
            <td style="padding:12px 16px;width:50%;">
              <span class="text-muted" style="font-size:9px;letter-spacing:2.5px;color:#64748B;text-transform:uppercase;display:block;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">SEAT / CAPACITY</span>
              <span class="text-heading" style="font-size:13px;font-weight:600;color:#0F172A;display:block;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(seatDisplay)}</span>
            </td>
          </tr>
        </table>

        <!-- Venue / Perks Footer Line -->
        <div style="margin-bottom:24px;padding:10px 14px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;">
          <div style="font-size:11px;color:#334155;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <strong>VENUE:</strong> ${escapeHtml(event.venue)}
          </div>
          ${tierName ? `
          <div style="font-size:10px;color:#64748B;margin-top:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <strong>TIER (${escapeHtml(tierName)}):</strong> ${perksText}
          </div>` : ''}
        </div>

      </div>

      <!-- Torn / Perforated Edge Divider -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="border-top:2px dashed #94A3B8;padding:12px 0;text-align:center;background-color:#F8FAFC;">
            <span style="font-size:9px;letter-spacing:3px;color:#64748B;text-transform:uppercase;font-family:'Courier New',Courier,monospace;">
              ✂ BOARDING PASS STUB — SCAN FOR GATE ENTRY ✂
            </span>
          </td>
        </tr>
      </table>

      <!-- Stub / Barcode Section -->
      <div class="stub-bg" style="background-color:#F8FAFC;padding:24px;text-align:center;border-top:1px solid #E2E8F0;">
        
        <div style="display:inline-block;padding:12px;background-color:#FFFFFF;border:2px solid #0F172A;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
          <img src="${qrCidOrSrc}" alt="Boarding QR Code" width="180" height="180" style="display:block;border:none;" />
        </div>

        <!-- Simulated Airline Barcode lines -->
        <div style="margin-top:16px;font-family:'Courier New',Courier,monospace;font-size:16px;letter-spacing:4px;color:#0F172A;font-weight:bold;user-select:none;">
          ||| || | |||| || | || |||| | |||
        </div>
        <div style="font-size:10px;letter-spacing:2px;color:#64748B;margin-top:4px;font-family:'Courier New',Courier,monospace;">
          ${passCode}
        </div>

      </div>

    </div>

    <!-- Micro Footer -->
    <div style="padding:24px 0 10px 0;text-align:center;">
      <p style="font-size:9px;letter-spacing:2px;color:#64748B;margin:0 0 6px 0;text-transform:uppercase;">
        CRENELLE // BOARDING_PASS_SYSTEM
      </p>
      <p style="font-size:9px;color:#94A3B8;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        ${subtitleText}.
        <br>
        <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a> from future emails.
      </p>
    </div>

  </div>
</body>
</html>`
}

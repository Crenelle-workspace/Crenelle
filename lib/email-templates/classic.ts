import { escapeHtml, safeImageUrl } from '@/lib/email'
import { getOptimizedBannerUrl } from '@/lib/images'

export interface RenderOptions {
  emailType: 'invitation' | 'reminder'
  event: {
    name: string
    date: string
    time: string | null
    venue: string
    banner_url?: string | null
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
}

export function renderClassicTheme(options: RenderOptions): string {
  const {
    emailType,
    event,
    recipientName,
    partySizeText,
    eventDateFormatted,
    timeFormatted,
    seatHtml,
    tierHtml,
    unsubscribeUrl,
    customMessage,
    qrCidOrSrc = 'cid:qrcode',
  } = options

  const isReminder = emailType === 'reminder'
  const eyebrowText = isReminder ? 'EVENT REMINDER & PASS' : 'CONFIRMED ENTRY PASS'
  const qrSectionEyebrow = isReminder ? 'YOUR ENTRY PASS' : 'SCAN AT THE GATE FOR ENTRY'
  const footerCode = isReminder ? 'CRENELLE // EVENT_REMINDER' : 'CRENELLE // VERIFIED_INVITATION'
  const footerMessage = isReminder
    ? 'You received this reminder because you are a confirmed guest for this event.'
    : 'You received this email because you were invited to this event.'

  const messageCalloutHtml = (isReminder && customMessage) ? `
      <div class="message-callout" style="background-color:rgba(191,132,48,0.04);border:1px solid rgba(191,132,48,0.2);border-radius:2px;padding:20px;margin-bottom:30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;color:#0C0B09;">
        ${escapeHtml(customMessage)}
      </div>` : ''

  const disclaimerTextHtml = !isReminder ? `
        <p class="text-secondary" style="font-size:10px;letter-spacing:1px;color:#5C5850;margin:20px 0 0 0;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          This pass is unique to you. Do not replicate or share.
        </p>` : ''

  const extraDarkStyle = isReminder ? `
      .message-callout {
        background-color: rgba(191, 132, 48, 0.08) !important;
        border-color: rgba(191, 132, 48, 0.3) !important;
        color: #EEEAE3 !important;
      }` : ''

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
        background-color: #0C0B09 !important;
      }
      .bg-card {
        background-color: #171512 !important;
      }
      .border-card {
        border-color: rgba(238, 234, 227, 0.10) !important;
      }
      .text-primary {
        color: #EEEAE3 !important;
      }
      .text-secondary {
        color: #9E9890 !important;
      }
      .text-accent {
        color: #D4A050 !important;
      }
      .qr-wrapper {
        background-color: #EEEAE3 !important;
        border: 2px solid rgba(238, 234, 227, 0.20) !important;
      }
      .rule-accent {
        background: linear-gradient(to right, transparent, rgba(191, 132, 48, 0.6), transparent) !important;
      }${extraDarkStyle}
    }
  </style>
</head>
<body class="bg-body" style="margin:0;padding:0;background-color:#F4F1EC;font-family:'Courier New',Courier,monospace;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Outer Card -->
    <div class="bg-card border-card" style="background-color:#FFFFFF;border:1px solid rgba(12,11,9,0.14);border-radius:2px;padding:40px;box-shadow:0 4px 12px rgba(12,11,9,0.02);">
      
      <!-- Top Branding -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td>
            <span class="text-accent" style="font-size:10px;font-weight:600;letter-spacing:4px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">CRENELLE</span>
          </td>
          <td style="text-align:right;">
            <span class="text-secondary" style="font-size:9px;letter-spacing:1px;color:#5C5850;text-transform:uppercase;">Entry System</span>
          </td>
        </tr>
      </table>

      ${event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email')) ? `
      <!-- Banner Image -->
      <div style="margin-bottom:24px;border:1px solid rgba(12,11,9,0.08);border-radius:2px;overflow:hidden;background-color:#F4F1EC;">
        <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)} Banner" style="width:100%;height:auto;display:block;border:none;" />
      </div>
      ` : ''}

      <!-- Title / Header -->
      <div style="margin-bottom:30px;">
        <p class="text-accent" style="font-size:11px;font-weight:bold;letter-spacing:3px;color:#BF8430;margin:0 0 10px 0;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ${eyebrowText}
        </p>
        <h1 class="text-primary" style="font-size:32px;line-height:1.2;font-weight:800;color:#0C0B09;margin:0;text-transform:uppercase;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ${escapeHtml(event.name)}
        </h1>
      </div>

      <!-- Accent line -->
      <div class="rule-accent" style="height:1px;background:linear-gradient(to right, transparent, rgba(191,132,48,0.3), transparent);margin-bottom:30px;"></div>

      ${messageCalloutHtml}

      <!-- Details Table -->
      <div style="margin-bottom:35px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:120px;font-weight:600;">DATE</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${eventDateFormatted}</td>
          </tr>
          ${event.time ? `
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">TIME</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${timeFormatted}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">VENUE</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(event.venue)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">GUEST</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(recipientName)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">ADMITS</td>
            <td class="text-accent" style="padding:10px 0;font-size:15px;color:#BF8430;font-weight:bold;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${partySizeText}</td>
          </tr>
          ${seatHtml}
          ${tierHtml}
        </table>
      </div>

      <!-- Divider -->
      <div class="rule-accent" style="height:1px;background:linear-gradient(to right, transparent, rgba(191,132,48,0.2), transparent);margin-bottom:35px;"></div>

      <!-- QR Section -->
      <div style="text-align:center;">
        <p class="text-secondary" style="font-size:10px;letter-spacing:3px;color:#5C5850;margin:0 0 20px 0;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ${qrSectionEyebrow}
        </p>
        <div class="qr-wrapper" style="display:inline-block;border:1px solid rgba(12,11,9,0.08);padding:16px;background-color:#F4F1EC;border-radius:2px;">
          <img src="${qrCidOrSrc}" alt="Entry QR Code" width="220" height="220" style="display:block;border:none;" />
        </div>
        ${disclaimerTextHtml}
      </div>

    </div>

    <!-- Micro Footer -->
    <div style="padding:30px 0 10px 0;text-align:center;">
      <p class="text-secondary" style="font-size:9px;letter-spacing:2.5px;color:#5C5850;margin:0 0 10px 0;text-transform:uppercase;">
        ${footerCode}
      </p>
      <p style="font-size:9px;color:#9E9890;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        ${footerMessage}
        <br>
        <a href="${unsubscribeUrl}" style="color:#9E9890;text-decoration:underline;">Unsubscribe</a> from future emails.
      </p>
    </div>
  </div>
</body>
</html>`
}

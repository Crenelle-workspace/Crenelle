import { escapeHtml, safeImageUrl } from '@/lib/email'
import { getOptimizedBannerUrl } from '@/lib/images'
import type { RenderOptions } from './classic'

export function renderMinimalMonoTheme(options: RenderOptions & {
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
  const titleText = isReminder ? 'EVENT REMINDER' : 'CONFIRMED PASS'
  const codeTag = qrToken ? qrToken.replace(/-/g, '').slice(0, 8).toUpperCase() : 'MONO-01'

  const bannerHtml = (event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))) ? `
    <div style="margin-bottom:32px;border:1px solid #111111;overflow:hidden;">
      <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)}" style="width:100%;height:auto;display:block;filter:grayscale(100%);" />
    </div>` : ''

  const customMsgHtml = customMessage ? `
    <div class="msg-box" style="border:1px solid #111111;padding:16px;margin-bottom:32px;font-size:13px;line-height:1.6;color:#111111;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;margin-bottom:6px;font-weight:bold;">// NOTICE</div>
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
        background-color: #050505 !important;
      }
      .bg-card {
        background-color: #0D0D0D !important;
        border-color: #262626 !important;
      }
      .text-primary {
        color: #FAFAFA !important;
      }
      .text-muted {
        color: #A1A1AA !important;
      }
      .border-line {
        border-color: #262626 !important;
      }
      .msg-box {
        border-color: #3F3F46 !important;
        color: #FAFAFA !important;
      }
      .qr-bg {
        background-color: #FAFAFA !important;
        padding: 12px !important;
      }
    }
  </style>
</head>
<body class="bg-body" style="margin:0;padding:0;background-color:#FAFAFA;font-family:'Courier New',Courier,monospace;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;padding:40px 16px;">
    
    <!-- Outer Gallery Card -->
    <div class="bg-card" style="background-color:#FFFFFF;border:1px solid #111111;padding:40px;">
      
      <!-- Top Monospace Bar -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:36px;border-bottom:1px solid #111111;padding-bottom:16px;">
        <tr>
          <td style="padding-bottom:16px;">
            <span style="font-size:11px;letter-spacing:4px;font-weight:700;color:#111111;" class="text-primary">CRENELLE / ARCHIVE</span>
          </td>
          <td style="text-align:right;padding-bottom:16px;">
            <span style="font-size:10px;letter-spacing:2px;color:#71717A;" class="text-muted">[NO: ${codeTag}]</span>
          </td>
        </tr>
      </table>

      ${bannerHtml}

      <!-- Main Title -->
      <div style="margin-bottom:36px;">
        <div style="font-size:10px;letter-spacing:3px;color:#71717A;margin-bottom:8px;" class="text-muted">// ${titleText}</div>
        <h1 class="text-primary" style="font-size:30px;line-height:1.15;font-weight:400;letter-spacing:-0.5px;color:#111111;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ${escapeHtml(event.name)}
        </h1>
      </div>

      ${customMsgHtml}

      <!-- Structured Grid Details -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:36px;">
        <tr>
          <td class="border-line" style="padding:14px 0;border-top:1px solid #111111;font-size:10px;letter-spacing:2px;color:#71717A;width:120px;" class="text-muted">DATE</td>
          <td class="border-line text-primary" style="padding:14px 0;border-top:1px solid #111111;font-size:14px;color:#111111;font-family:-apple-system,sans-serif;">${eventDateFormatted}</td>
        </tr>
        ${timeFormatted ? `
        <tr>
          <td class="border-line" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:10px;letter-spacing:2px;color:#71717A;" class="text-muted">TIME</td>
          <td class="border-line text-primary" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:14px;color:#111111;font-family:-apple-system,sans-serif;">${timeFormatted}</td>
        </tr>` : ''}
        <tr>
          <td class="border-line" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:10px;letter-spacing:2px;color:#71717A;" class="text-muted">VENUE</td>
          <td class="border-line text-primary" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:14px;color:#111111;font-family:-apple-system,sans-serif;">${escapeHtml(event.venue)}</td>
        </tr>
        <tr>
          <td class="border-line" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:10px;letter-spacing:2px;color:#71717A;" class="text-muted">PASSENGER</td>
          <td class="border-line text-primary" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:14px;color:#111111;font-family:-apple-system,sans-serif;">${escapeHtml(recipientName)}</td>
        </tr>
        <tr>
          <td class="border-line" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:10px;letter-spacing:2px;color:#71717A;" class="text-muted">ADMISSION</td>
          <td class="border-line text-primary" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:14px;color:#111111;font-weight:600;font-family:-apple-system,sans-serif;">${partySizeText}</td>
        </tr>
        ${seatInfo ? `
        <tr>
          <td class="border-line" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:10px;letter-spacing:2px;color:#71717A;" class="text-muted">LOCATION</td>
          <td class="border-line text-primary" style="padding:14px 0;border-top:1px solid #E4E4E7;font-size:14px;color:#111111;font-family:-apple-system,sans-serif;">${escapeHtml(seatInfo)}</td>
        </tr>` : ''}
        ${tierName ? `
        <tr>
          <td class="border-line" style="padding:14px 0;border-top:1px solid #E4E4E7;border-bottom:1px solid #111111;font-size:10px;letter-spacing:2px;color:#71717A;" class="text-muted">TIER</td>
          <td class="border-line text-primary" style="padding:14px 0;border-top:1px solid #E4E4E7;border-bottom:1px solid #111111;font-size:14px;color:#111111;font-family:-apple-system,sans-serif;">
            ${escapeHtml(tierName)}
            ${tierPerks.length > 0 ? `<div style="font-size:11px;color:#71717A;margin-top:4px;">${tierPerks.map(p => escapeHtml(p)).join(' · ')}</div>` : ''}
          </td>
        </tr>` : ''}
      </table>

      <!-- QR Code Minimal Frame -->
      <div style="text-align:center;padding:24px 0 0 0;">
        <div class="qr-bg" style="display:inline-block;border:1px solid #111111;padding:16px;background-color:#FFFFFF;">
          <img src="${qrCidOrSrc}" alt="Entry QR" width="200" height="200" style="display:block;border:none;" />
        </div>
        <div style="font-size:9px;letter-spacing:3px;color:#71717A;margin-top:16px;" class="text-muted">
          // PRESENT AT ENTRANCE FOR DIGITAL VALIDATION
        </div>
      </div>

    </div>

    <!-- Micro Footer -->
    <div style="padding:24px 0 10px 0;text-align:center;">
      <p style="font-size:9px;letter-spacing:2px;color:#71717A;margin:0 0 6px 0;">
        CRENELLE // MINIMAL_SERIES
      </p>
      <p style="font-size:9px;color:#A1A1AA;margin:0;">
        <a href="${unsubscribeUrl}" style="color:#71717A;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

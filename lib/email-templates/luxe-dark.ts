import { escapeHtml, safeImageUrl } from '@/lib/email'
import { getOptimizedBannerUrl } from '@/lib/images'
import type { RenderOptions } from './classic'

export function renderLuxeDarkTheme(options: RenderOptions & {
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
  const titleText = isReminder ? 'VIP EVENT REMINDER' : 'VIP ENTRY PASS'
  const passCode = qrToken ? qrToken.replace(/-/g, '').slice(0, 10).toUpperCase() : 'LUXE-VIP'

  const bannerHtml = (event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))) ? `
    <div style="margin-bottom:24px;border-radius:4px;overflow:hidden;border:1px solid #332B15;">
      <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)}" style="width:100%;height:auto;display:block;" />
    </div>` : ''

  const customMsgHtml = customMessage ? `
    <div style="background-color:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.3);border-radius:4px;padding:18px;margin-bottom:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#F3E5AB;">
      <strong style="color:#D4AF37;display:block;margin-bottom:6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">ORGANIZER NOTE</strong>
      ${escapeHtml(customMessage)}
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <style>
    :root {
      color-scheme: dark light;
      supported-color-schemes: dark light;
    }
    
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0C;font-family:Georgia,serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:40px 16px;">
    
    <!-- Luxe Card Frame -->
    <div style="background-color:#141419;border:1px solid #332B15;border-radius:6px;padding:40px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
      
      <!-- Top Gold Emblem Bar -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
        <tr>
          <td>
            <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#D4AF37;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">CRENELLE</span>
            <span style="font-size:9px;letter-spacing:2px;color:#8C7B4D;display:block;margin-top:2px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">EXCLUSIVE INVITATION</span>
          </td>
          <td style="text-align:right;">
            <span style="font-size:10px;letter-spacing:2px;color:#D4AF37;border:1px solid #4D401D;padding:4px 10px;border-radius:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${titleText}</span>
          </td>
        </tr>
      </table>

      ${bannerHtml}

      <!-- Event Title Header -->
      <div style="margin-bottom:30px;text-align:center;">
        <div style="font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ◆ AN EXCLUSIVE INVITATION TO ◆
        </div>
        <h1 style="font-size:32px;line-height:1.2;font-weight:400;color:#F8F6F0;margin:0;letter-spacing:-0.5px;font-family:Georgia,serif;">
          ${escapeHtml(event.name)}
        </h1>
        <div style="height:1px;background:linear-gradient(to right, transparent, #D4AF37, transparent);margin:24px auto 0 auto;width:80%;"></div>
      </div>

      ${customMsgHtml}

      <!-- Luxury Details Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:36px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:10px;letter-spacing:3px;color:#8C7B4D;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:120px;">DATE</td>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:15px;color:#F8F6F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${eventDateFormatted}</td>
        </tr>
        ${timeFormatted ? `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:10px;letter-spacing:3px;color:#8C7B4D;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TIME</td>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:15px;color:#F8F6F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${timeFormatted}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:10px;letter-spacing:3px;color:#8C7B4D;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">VENUE</td>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:15px;color:#F8F6F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(event.venue)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:10px;letter-spacing:3px;color:#8C7B4D;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">HONORED GUEST</td>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:15px;color:#D4AF37;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(recipientName)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:10px;letter-spacing:3px;color:#8C7B4D;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">ACCESS</td>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:15px;color:#F8F6F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${partySizeText}</td>
        </tr>
        ${seatInfo ? `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:10px;letter-spacing:3px;color:#8C7B4D;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">RESERVED SEAT</td>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:15px;color:#F8F6F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(seatInfo)}</td>
        </tr>` : ''}
        ${tierName ? `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:10px;letter-spacing:3px;color:#8C7B4D;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TIER CLASS</td>
          <td style="padding:12px 0;border-bottom:1px solid #24242D;font-size:15px;color:#D4AF37;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${escapeHtml(tierName)}
            ${tierPerks.length > 0 ? `<div style="font-size:11px;color:#8C7B4D;margin-top:4px;">${tierPerks.map(p => escapeHtml(p)).join(' · ')}</div>` : ''}
          </td>
        </tr>` : ''}
      </table>

      <!-- QR Gold Frame Section -->
      <div style="text-align:center;">
        <div style="font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;margin-bottom:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          OFFICIAL VERIFICATION CODE: ${passCode}
        </div>
        <div style="display:inline-block;padding:16px;background-color:#F8F6F0;border:2px solid #D4AF37;border-radius:4px;box-shadow:0 0 20px rgba(212,175,55,0.2);">
          <img src="${qrCidOrSrc}" alt="VIP QR Pass" width="210" height="210" style="display:block;border:none;" />
        </div>
      </div>

    </div>

    <!-- Micro Footer -->
    <div style="padding:30px 0 10px 0;text-align:center;">
      <p style="font-size:9px;letter-spacing:3px;color:#8C7B4D;margin:0 0 8px 0;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        CRENELLE // LUXURY_PASS
      </p>
      <p style="font-size:9px;color:#52472B;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <a href="${unsubscribeUrl}" style="color:#8C7B4D;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

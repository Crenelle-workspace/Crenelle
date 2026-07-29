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
  const badgeText = isReminder ? 'VIP REMINDER' : 'VIP PASS'
  const serialNo = qrToken
    ? qrToken.replace(/-/g, '').slice(0, 8).toUpperCase()
    : '884-0912'

  const bannerHtml = (event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))) ? `
    <!-- Editorial Banner -->
    <div style="margin-bottom:32px;border-radius:4px;overflow:hidden;border:1px solid rgba(197, 160, 89, 0.25);">
      <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)}" style="width:100%;height:auto;display:block;" />
    </div>` : ''

  const customMsgHtml = customMessage ? `
    <!-- Notice Box -->
    <div style="background-color:rgba(197, 160, 89, 0.04);border-left:2px solid #C5A059;padding:18px 20px;margin-bottom:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;color:#E8E4D9;">
      <span style="display:block;font-size:9px;letter-spacing:2.5px;color:#C5A059;text-transform:uppercase;font-weight:600;margin-bottom:6px;font-family:-apple-system,sans-serif;">ORGANIZER NOTE</span>
      ${escapeHtml(customMessage)}
    </div>` : ''

  const perksFormatted = tierPerks.length > 0
    ? tierPerks.map(p => escapeHtml(p)).join('  •  ')
    : ''

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
<body style="margin:0;padding:0;background-color:#0A0B0E;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;padding:48px 16px;">
    
    <!-- Outer Hairline Accent Frame -->
    <div style="background-color:#121319;border:1px solid #2A2518;border-radius:4px;padding:44px 36px;box-shadow:0 30px 70px rgba(0,0,0,0.9);">
      
      <!-- Top Brand Header & Serial -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:36px;border-bottom:1px solid rgba(197, 160, 89, 0.15);padding-bottom:18px;">
        <tr>
          <td style="padding-bottom:18px;">
            <span style="font-size:10px;font-weight:700;letter-spacing:4px;color:#C5A059;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">CRENELLE PRIVÉ</span>
          </td>
          <td style="text-align:right;padding-bottom:18px;">
            <span style="font-size:9px;letter-spacing:2px;color:#8A7A57;font-family:'Courier New',Courier,monospace;text-transform:uppercase;">N° ${serialNo}</span>
          </td>
        </tr>
      </table>

      ${bannerHtml}

      <!-- Main Invitation Header -->
      <div style="margin-bottom:40px;text-align:center;">
        <span style="display:block;font-size:9px;letter-spacing:3.5px;color:#C5A059;text-transform:uppercase;margin-bottom:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">AN EXCLUSIVE INVITATION TO</span>
        <h1 style="font-size:34px;line-height:1.2;font-weight:300;color:#F5F3EF;margin:0;letter-spacing:-0.5px;font-family:Georgia,'Times New Roman',serif;">
          ${escapeHtml(event.name)}
        </h1>
        <div style="height:1px;background:linear-gradient(90deg, transparent 0%, #C5A059 50%, transparent 100%);margin:28px auto 0 auto;width:60%;"></div>
      </div>

      ${customMsgHtml}

      <!-- Clean Bespoke Details Grid -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:40px;">
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:9px;letter-spacing:3px;color:#8A7A57;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:130px;font-weight:600;">HONORED GUEST</td>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:16px;color:#F5F3EF;font-weight:400;font-family:Georgia,serif;">${escapeHtml(recipientName)}</td>
        </tr>
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:9px;letter-spacing:3px;color:#8A7A57;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">DATE & TIME</td>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:14px;color:#E8E4D9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${eventDateFormatted}${timeFormatted ? `  •  ${timeFormatted}` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:9px;letter-spacing:3px;color:#8A7A57;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">VENUE</td>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:14px;color:#E8E4D9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(event.venue)}</td>
        </tr>
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:9px;letter-spacing:3px;color:#8A7A57;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">ADMITTANCE</td>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:14px;color:#E8E4D9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${partySizeText}</td>
        </tr>
        ${seatInfo ? `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:9px;letter-spacing:3px;color:#8A7A57;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">SEAT / ZONE</td>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:14px;color:#C5A059;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(seatInfo)}</td>
        </tr>` : ''}
        ${tierName ? `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:9px;letter-spacing:3px;color:#8A7A57;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">VIP TIER</td>
          <td style="padding:16px 0;border-bottom:1px solid rgba(197, 160, 89, 0.12);font-size:14px;color:#C5A059;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${escapeHtml(tierName)}
            ${perksFormatted ? `<div style="font-size:11px;color:#8A7A57;margin-top:4px;">${perksFormatted}</div>` : ''}
          </td>
        </tr>` : ''}
      </table>

      <!-- Minimal Gold QR Frame -->
      <div style="text-align:center;padding-top:10px;">
        <div style="font-size:9px;letter-spacing:3px;color:#C5A059;text-transform:uppercase;margin-bottom:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">
          DIGITAL ENTRY PASS — STATUS: ${badgeText}
        </div>
        
        <div style="display:inline-block;padding:16px;background-color:#FAF8F5;border:1px solid #C5A059;border-radius:4px;box-shadow:0 12px 30px rgba(0,0,0,0.5);">
          <img src="${qrCidOrSrc}" alt="VIP QR Code" width="200" height="200" style="display:block;border:none;" />
        </div>
        
        <div style="font-size:9px;letter-spacing:2px;color:#8A7A57;margin-top:16px;font-family:'Courier New',Courier,monospace;text-transform:uppercase;">
          ID // ${serialNo}
        </div>
      </div>

    </div>

    <!-- Micro Footer -->
    <div style="padding:32px 0 10px 0;text-align:center;">
      <p style="font-size:9px;letter-spacing:3px;color:#8A7A57;margin:0 0 8px 0;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        CRENELLE PRIVÉ // VERIFIED PASS
      </p>
      <p style="font-size:9px;color:#594F37;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <a href="${unsubscribeUrl}" style="color:#8A7A57;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

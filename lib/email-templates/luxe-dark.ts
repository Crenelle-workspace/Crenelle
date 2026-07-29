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
  const titleText = isReminder ? 'VIP REMINDER' : 'VIP PASS'
  const passCode = qrToken ? qrToken.replace(/-/g, '').slice(0, 10).toUpperCase() : 'LUXE-VIP'

  const bannerHtml = (event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))) ? `
    <!-- Luxury Frame Banner -->
    <div style="margin-bottom:30px;border-radius:4px;overflow:hidden;border:1px solid #4A3E1F;box-shadow:0 8px 20px rgba(0,0,0,0.5);">
      <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)}" style="width:100%;height:auto;display:block;" />
    </div>` : ''

  const customMsgHtml = customMessage ? `
    <!-- VIP Announcement Box -->
    <div style="background-color:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.3);border-left:3px solid #D4AF37;border-radius:4px;padding:20px;margin-bottom:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#F3E5AB;">
      <strong style="color:#D4AF37;display:block;margin-bottom:6px;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;">◆ ORGANIZER ANNOUNCEMENT ◆</strong>
      ${escapeHtml(customMessage)}
    </div>` : ''

  const perksFormatted = tierPerks.length > 0
    ? tierPerks.map(p => `<span style="display:inline-block;padding:2px 8px;margin:2px 4px 2px 0;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.25);border-radius:2px;font-size:10px;color:#F3E5AB;">◆ ${escapeHtml(p)}</span>`).join('')
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
<body style="margin:0;padding:0;background-color:#08080B;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:44px 16px;">
    
    <!-- Outer Gold Rule Accent -->
    <div style="height:2px;background:linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%);margin-bottom:12px;"></div>

    <!-- Luxe Card Frame -->
    <div style="background-color:#121218;border:1px solid #4A3E1F;outline:1px solid #282110;outline-offset:-6px;border-radius:6px;padding:44px 36px;box-shadow:0 30px 60px rgba(0,0,0,0.85);">
      
      <!-- Top Gold Emblem Header -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
        <tr>
          <td>
            <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#E6CA65;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">CRENELLE PRIVÉ</span>
            <span style="font-size:8px;letter-spacing:2px;color:#8C7B4D;display:block;margin-top:3px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">EXCLUSIVE GUEST PASS</span>
          </td>
          <td style="text-align:right;">
            <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:2px;color:#0A0A0C;background:linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%);padding:5px 12px;border-radius:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 2px 8px rgba(212,175,55,0.3);">${titleText}</span>
          </td>
        </tr>
      </table>

      ${bannerHtml}

      <!-- Event Title Header -->
      <div style="margin-bottom:36px;text-align:center;">
        <div style="font-size:10px;letter-spacing:3.5px;color:#D4AF37;text-transform:uppercase;margin-bottom:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">
          ◆ YOU ARE CORDIALLY INVITED ◆
        </div>
        <h1 style="font-size:32px;line-height:1.2;font-weight:400;color:#FAF8F5;margin:0;letter-spacing:-0.5px;font-family:Georgia,'Times New Roman',serif;">
          ${escapeHtml(event.name)}
        </h1>
        <div style="height:1px;background:linear-gradient(90deg, transparent 0%, #E6CA65 30%, #D4AF37 50%, #E6CA65 70%, transparent 100%);margin:24px auto 0 auto;width:75%;"></div>
      </div>

      ${customMsgHtml}

      <!-- Luxury Details Grid Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:40px;">
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:10px;letter-spacing:3px;color:#9E853C;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:130px;font-weight:600;">HONORED GUEST</td>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:16px;color:#F3E5AB;font-weight:600;font-family:Georgia,serif;">${escapeHtml(recipientName)}</td>
        </tr>
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:10px;letter-spacing:3px;color:#9E853C;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">DATE</td>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:15px;color:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${eventDateFormatted}</td>
        </tr>
        ${timeFormatted ? `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:10px;letter-spacing:3px;color:#9E853C;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TIME</td>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:15px;color:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${timeFormatted}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:10px;letter-spacing:3px;color:#9E853C;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">VENUE</td>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:15px;color:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(event.venue)}</td>
        </tr>
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:10px;letter-spacing:3px;color:#9E853C;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">ADMITTANCE</td>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:15px;color:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${partySizeText}</td>
        </tr>
        ${seatInfo ? `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:10px;letter-spacing:3px;color:#9E853C;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">SEAT ASSIGNMENT</td>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:15px;color:#F3E5AB;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(seatInfo)}</td>
        </tr>` : ''}
        ${tierName ? `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:10px;letter-spacing:3px;color:#9E853C;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">VIP TIER</td>
          <td style="padding:14px 0;border-bottom:1px solid rgba(212,175,55,0.15);font-size:15px;color:#F3E5AB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <strong style="color:#D4AF37;">${escapeHtml(tierName)}</strong>
            ${perksFormatted ? `<div style="margin-top:6px;">${perksFormatted}</div>` : ''}
          </td>
        </tr>` : ''}
      </table>

      <!-- Gold Vault QR Code Section -->
      <div style="text-align:center;padding-top:10px;">
        <div style="font-size:9px;letter-spacing:3.5px;color:#D4AF37;text-transform:uppercase;margin-bottom:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">
          ◆ OFFICIAL ENTRY CODE: <span style="font-family:'Courier New',monospace;font-size:12px;color:#F3E5AB;">${passCode}</span> ◆
        </div>
        
        <div style="display:inline-block;padding:18px;background-color:#FAF8F5;border:2px solid #D4AF37;border-radius:4px;box-shadow:0 0 30px rgba(212,175,55,0.25);">
          <img src="${qrCidOrSrc}" alt="VIP Access QR Code" width="220" height="220" style="display:block;border:none;" />
        </div>
        
        <div style="font-size:9px;letter-spacing:2px;color:#8C7B4D;margin-top:18px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          PRESENT DIGITAL PASS AT MAIN ENTRANCE
        </div>
      </div>

    </div>

    <!-- Bottom Gold Rule Accent -->
    <div style="height:2px;background:linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%);margin-top:12px;"></div>

    <!-- Micro Footer -->
    <div style="padding:28px 0 10px 0;text-align:center;">
      <p style="font-size:9px;letter-spacing:3px;color:#8C7B4D;margin:0 0 8px 0;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        CRENELLE // PRIVÉ_PASSPORT
      </p>
      <p style="font-size:9px;color:#52472B;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <a href="${unsubscribeUrl}" style="color:#8C7B4D;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

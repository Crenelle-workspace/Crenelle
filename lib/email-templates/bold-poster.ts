import { escapeHtml, safeImageUrl } from '@/lib/email'
import { getOptimizedBannerUrl } from '@/lib/images'
import type { RenderOptions } from './classic'

export function renderBoldPosterTheme(options: RenderOptions & {
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
  const titleBadge = isReminder ? 'REMINDER PASS' : 'ADMIT ONE'
  const passCode = qrToken ? qrToken.replace(/-/g, '').slice(0, 8).toUpperCase() : 'POSTER-01'

  const bannerHtml = (event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))) ? `
    <div style="margin-bottom:24px;border-radius:8px;overflow:hidden;border:2px solid #000000;">
      <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)}" style="width:100%;height:auto;display:block;" />
    </div>` : ''

  const customMsgHtml = customMessage ? `
    <div style="background-color:#FEF08A;border:2px solid #000000;border-radius:8px;padding:18px;margin-bottom:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.5;color:#000000;box-shadow:3px 3px 0px #000000;">
      <strong style="display:block;margin-bottom:4px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">⚡ EVENT NOTICE:</strong>
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
        background-color: #09090B !important;
      }
      .bg-card {
        background-color: #18181B !important;
        border-color: #3F3F46 !important;
        box-shadow: 4px 4px 0px #6366F1 !important;
      }
      .text-heading {
        color: #FAFAFA !important;
      }
      .text-body {
        color: #E4E4E7 !important;
      }
      .box-block {
        background-color: #27272A !important;
        border-color: #3F3F46 !important;
        color: #FAFAFA !important;
      }
    }
  </style>
</head>
<body class="bg-body" style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:40px 16px;">
    
    <!-- Outer Card Frame with Bold Neo-Brutalist Border & Shadow -->
    <div class="bg-card" style="background-color:#FFFFFF;border:3px solid #000000;border-radius:12px;overflow:hidden;box-shadow:6px 6px 0px #000000;">
      
      <!-- Electric Header Banner -->
      <table style="width:100%;border-collapse:collapse;background-color:#4F46E5;padding:20px 24px;">
        <tr>
          <td style="padding:20px 24px;">
            <span style="font-size:12px;font-weight:900;letter-spacing:3px;color:#A5B4FC;text-transform:uppercase;">CRENELLE FESTIVAL PASS</span>
            <div style="font-size:26px;font-weight:900;color:#FFFFFF;margin-top:4px;letter-spacing:-0.5px;text-transform:uppercase;line-height:1.1;">
              ${escapeHtml(event.name)}
            </div>
          </td>
          <td style="padding:20px 24px;text-align:right;vertical-align:top;">
            <span style="display:inline-block;padding:6px 12px;background-color:#10B981;color:#000000;font-size:11px;font-weight:900;letter-spacing:1px;border-radius:20px;border:2px solid #000000;">
              ${titleBadge}
            </span>
          </td>
        </tr>
      </table>

      <!-- Card Inner Content -->
      <div style="padding:28px;">
        
        ${bannerHtml}
        ${customMsgHtml}

        <!-- 2x2 Info Block Layout -->
        <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:24px;margin-left:-8px;margin-right:-8px;">
          <tr>
            <td class="box-block" style="width:50%;background-color:#F4F4F5;border:2px solid #000000;border-radius:8px;padding:14px;box-shadow:2px 2px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">DATE</span>
              <span class="text-heading" style="font-size:14px;font-weight:800;color:#000000;display:block;margin-top:2px;">${eventDateFormatted}</span>
            </td>
            <td class="box-block" style="width:50%;background-color:#F4F4F5;border:2px solid #000000;border-radius:8px;padding:14px;box-shadow:2px 2px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">TIME</span>
              <span class="text-heading" style="font-size:14px;font-weight:800;color:#000000;display:block;margin-top:2px;">${timeFormatted || 'ALL DAY'}</span>
            </td>
          </tr>
          <tr>
            <td class="box-block" style="width:50%;background-color:#F4F4F5;border:2px solid #000000;border-radius:8px;padding:14px;box-shadow:2px 2px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">ATTENDEE</span>
              <span class="text-heading" style="font-size:14px;font-weight:800;color:#000000;display:block;margin-top:2px;">${escapeHtml(recipientName)}</span>
            </td>
            <td class="box-block" style="width:50%;background-color:#F4F4F5;border:2px solid #000000;border-radius:8px;padding:14px;box-shadow:2px 2px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">ENTRY TICKET</span>
              <span class="text-heading" style="font-size:14px;font-weight:800;color:#000000;display:block;margin-top:2px;">${partySizeText}</span>
            </td>
          </tr>
        </table>

        <!-- Venue & Tier Banner Block -->
        <div class="box-block" style="background-color:#F4F4F5;border:2px solid #000000;border-radius:8px;padding:14px 18px;margin-bottom:28px;box-shadow:2px 2px 0px #000000;">
          <div style="font-size:13px;font-weight:700;" class="text-heading">
            📍 <strong>LOCATION:</strong> ${escapeHtml(event.venue)}
          </div>
          ${seatInfo ? `
          <div style="font-size:12px;color:#059669;font-weight:800;margin-top:6px;">
            💺 <strong>SEAT / ZONE:</strong> ${escapeHtml(seatInfo)}
          </div>` : ''}
          ${tierName ? `
          <div style="font-size:12px;color:#4F46E5;font-weight:800;margin-top:6px;">
            🎟️ <strong>TIER:</strong> ${escapeHtml(tierName)} ${tierPerks.length > 0 ? `(${tierPerks.map(p => escapeHtml(p)).join(' · ')})` : ''}
          </div>` : ''}
        </div>

        <!-- High-Impact QR Code Container -->
        <div style="text-align:center;background-color:#4F46E5;border:3px solid #000000;border-radius:8px;padding:24px;box-shadow:4px 4px 0px #000000;">
          <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;margin-bottom:16px;">
            SCAN FOR EVENT ENTRY • NO: ${passCode}
          </div>
          <div style="display:inline-block;padding:16px;background-color:#FFFFFF;border:3px solid #000000;border-radius:8px;">
            <img src="${qrCidOrSrc}" alt="Festival Entry Code" width="210" height="210" style="display:block;border:none;" />
          </div>
        </div>

      </div>

    </div>

    <!-- Micro Footer -->
    <div style="padding:24px 0 10px 0;text-align:center;">
      <p style="font-size:10px;font-weight:900;letter-spacing:2px;color:#71717A;margin:0 0 6px 0;text-transform:uppercase;">
        CRENELLE // BOLD_POSTER_SERIES
      </p>
      <p style="font-size:9px;color:#A1A1AA;margin:0;">
        <a href="${unsubscribeUrl}" style="color:#71717A;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

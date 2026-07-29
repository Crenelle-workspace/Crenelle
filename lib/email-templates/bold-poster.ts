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
  const passCode = qrToken ? qrToken.replace(/-/g, '').slice(0, 10).toUpperCase() : 'POSTER-01'

  const bannerHtml = (event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))) ? `
    <!-- High Contrast Festival Banner -->
    <div style="margin-bottom:24px;border-radius:6px;overflow:hidden;border:3px solid #000000;box-shadow:4px 4px 0px #000000;">
      <img src="${safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email'))}" alt="${escapeHtml(event.name)}" style="width:100%;height:auto;display:block;" />
    </div>` : ''

  const customMsgHtml = customMessage ? `
    <!-- Neon Warning Sticker Notice -->
    <div style="background-color:#CCFF00;border:3px solid #000000;border-radius:6px;padding:18px;margin-bottom:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.5;color:#000000;box-shadow:4px 4px 0px #000000;">
      <strong style="display:block;margin-bottom:4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:900;">⚡ FESTIVAL ANNOUNCEMENT:</strong>
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
        border-color: #FFFFFF !important;
        box-shadow: 8px 8px 0px #CCFF00 !important;
      }
      .text-heading {
        color: #FAFAFA !important;
      }
      .box-block {
        background-color: #27272A !important;
        border-color: #FAFAFA !important;
        color: #FAFAFA !important;
      }
    }
  </style>
</head>
<body class="bg-body" style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:40px 16px;">
    
    <!-- Outer Card Frame with Heavy Neo-Brutalist Border & Drop Shadow -->
    <div class="bg-card" style="background-color:#FFFFFF;border:4px solid #000000;border-radius:12px;overflow:hidden;box-shadow:8px 8px 0px #000000;">
      
      <!-- Electric Header Banner -->
      <table style="width:100%;border-collapse:collapse;background-color:#4F46E5;padding:24px;">
        <tr>
          <td style="padding:24px;">
            <span style="font-size:11px;font-weight:900;letter-spacing:3.5px;color:#A5B4FC;text-transform:uppercase;display:block;margin-bottom:6px;">CRENELLE // LIVE PASS</span>
            <div style="font-size:28px;font-weight:900;color:#FFFFFF;letter-spacing:-0.8px;text-transform:uppercase;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
              ${escapeHtml(event.name)}
            </div>
          </td>
          <td style="padding:24px;text-align:right;vertical-align:top;">
            <span style="display:inline-block;padding:6px 14px;background-color:#CCFF00;color:#000000;font-size:11px;font-weight:900;letter-spacing:1.5px;border-radius:4px;border:2.5px solid #000000;box-shadow:2px 2px 0px #000000;">
              ${titleBadge}
            </span>
          </td>
        </tr>
      </table>

      <!-- Card Inner Content -->
      <div style="padding:28px;">
        
        ${bannerHtml}
        ${customMsgHtml}

        <!-- 2x2 Info Block Grid Layout -->
        <table style="width:100%;border-collapse:separate;border-spacing:10px;margin-bottom:20px;margin-left:-10px;margin-right:-10px;">
          <tr>
            <td class="box-block" style="width:50%;background-color:#FFFFFF;border:3px solid #000000;border-radius:8px;padding:16px;box-shadow:3px 3px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">DATE</span>
              <span class="text-heading" style="font-size:15px;font-weight:900;color:#000000;display:block;margin-top:4px;">${eventDateFormatted}</span>
            </td>
            <td class="box-block" style="width:50%;background-color:#FFFFFF;border:3px solid #000000;border-radius:8px;padding:16px;box-shadow:3px 3px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">TIME</span>
              <span class="text-heading" style="font-size:15px;font-weight:900;color:#000000;display:block;margin-top:4px;">${timeFormatted || 'ALL DAY'}</span>
            </td>
          </tr>
          <tr>
            <td class="box-block" style="width:50%;background-color:#FFFFFF;border:3px solid #000000;border-radius:8px;padding:16px;box-shadow:3px 3px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">PASSENGER</span>
              <span class="text-heading" style="font-size:15px;font-weight:900;color:#000000;display:block;margin-top:4px;">${escapeHtml(recipientName)}</span>
            </td>
            <td class="box-block" style="width:50%;background-color:#FFFFFF;border:3px solid #000000;border-radius:8px;padding:16px;box-shadow:3px 3px 0px #000000;">
              <span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:#4F46E5;text-transform:uppercase;display:block;">TICKET CAPACITY</span>
              <span class="text-heading" style="font-size:15px;font-weight:900;color:#000000;display:block;margin-top:4px;">${partySizeText}</span>
            </td>
          </tr>
        </table>

        <!-- Venue, Seat & Tier Banner Block -->
        <div class="box-block" style="background-color:#FFFFFF;border:3px solid #000000;border-radius:8px;padding:16px 20px;margin-bottom:28px;box-shadow:4px 4px 0px #000000;">
          <div style="font-size:14px;font-weight:900;" class="text-heading">
            📍 <strong>VENUE:</strong> ${escapeHtml(event.venue)}
          </div>
          ${seatInfo ? `
          <div style="font-size:13px;color:#059669;font-weight:900;margin-top:8px;">
            💺 <strong>SEAT / ZONE:</strong> ${escapeHtml(seatInfo)}
          </div>` : ''}
          ${tierName ? `
          <div style="font-size:13px;color:#4F46E5;font-weight:900;margin-top:8px;">
            🎟️ <strong>TIER:</strong> ${escapeHtml(tierName)} ${tierPerks.length > 0 ? `(${tierPerks.map(p => escapeHtml(p)).join(' · ')})` : ''}
          </div>` : ''}
        </div>

      </div>

      <!-- Torn / Perforated Stub Divider -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="border-top:3px dashed #000000;padding:14px 0;text-align:center;background-color:#FEF08A;">
            <span style="font-size:10px;font-weight:900;letter-spacing:3px;color:#000000;text-transform:uppercase;font-family:'Courier New',Courier,monospace;">
              ✂ TEAR HERE FOR FESTIVAL ENTRY ✂
            </span>
          </td>
        </tr>
      </table>

      <!-- Industrial Barcode & High-Impact QR Block -->
      <div style="background-color:#F4F4F5;padding:28px;text-align:center;border-top:3px solid #000000;">
        
        <div style="font-size:11px;font-weight:900;letter-spacing:2.5px;color:#4F46E5;text-transform:uppercase;margin-bottom:16px;">
          SCAN CODE AT ENTRY GATE
        </div>

        <div style="display:inline-block;padding:18px;background-color:#FFFFFF;border:4px solid #000000;border-radius:8px;box-shadow:6px 6px 0px #000000;">
          <img src="${qrCidOrSrc}" alt="Festival Entry QR Code" width="220" height="220" style="display:block;border:none;" />
        </div>

        <!-- Simulated Raw Industrial Barcode -->
        <div style="margin-top:20px;font-family:'Courier New',Courier,monospace;font-size:18px;letter-spacing:5px;color:#000000;font-weight:900;user-select:none;">
          ||| || | |||| || | || |||| | |||
        </div>
        <div style="font-size:11px;letter-spacing:3px;color:#000000;margin-top:6px;font-weight:900;font-family:'Courier New',Courier,monospace;">
          ${passCode}
        </div>

      </div>

    </div>

    <!-- Micro Footer -->
    <div style="padding:28px 0 10px 0;text-align:center;">
      <p style="font-size:10px;font-weight:900;letter-spacing:2.5px;color:#71717A;margin:0 0 6px 0;text-transform:uppercase;">
        CRENELLE // BOLD_NEO_BRUTALIST_SERIES
      </p>
      <p style="font-size:9px;color:#A1A1AA;margin:0;">
        <a href="${unsubscribeUrl}" style="color:#71717A;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

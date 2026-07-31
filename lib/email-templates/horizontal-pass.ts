import { escapeHtml, safeImageUrl } from '@/lib/email'
import { getOptimizedBannerUrl } from '@/lib/images'
import type { RenderOptions } from './classic'

export function renderHorizontalPassTheme(options: RenderOptions & {
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
  const badgeText = isReminder ? 'REMINDER STUB' : 'HORIZONTAL STRIP'
  const serialNo = qrToken ? qrToken.replace(/-/g, '').slice(0, 8).toUpperCase() : 'STRIP-904'

  const hasBanner = !!(event.banner_url && safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email')))
  const bannerUrl = hasBanner ? safeImageUrl(getOptimizedBannerUrl(event.banner_url, 'email')) : ''

  const bannerHtml = hasBanner ? `
    <!-- Top Full-Width Event Banner -->
    <div style="width:100%;overflow:hidden;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom:2px solid #06B6D4;">
      <img src="${bannerUrl}" alt="${escapeHtml(event.name)}" style="width:100%;height:auto;max-height:220px;object-fit:cover;display:block;border:none;" />
    </div>` : ''

  const perksHtml = tierPerks && tierPerks.length > 0 ? `
    <div style="margin-top:8px;font-size:10px;color:#06B6D4;font-family:-apple-system,sans-serif;">
      <span style="font-weight:700;letter-spacing:1.5px;font-size:8px;font-family:'Courier New',monospace;text-transform:uppercase;color:#64748B;display:block;margin-bottom:2px;">INCLUDED PERKS</span>
      ${tierPerks.map(p => `✦ ${escapeHtml(p)}`).join(' &nbsp;•&nbsp; ')}
    </div>` : ''

  const customMsgHtml = customMessage ? `
    <div class="box-notice" style="background-color:rgba(6, 182, 212, 0.08);border-left:3px solid #06B6D4;padding:10px 14px;margin-top:12px;font-family:-apple-system,sans-serif;font-size:12px;line-height:1.5;color:#1E293B;border-radius:2px;">
      <strong style="color:#06B6D4;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-family:'Courier New',monospace;display:block;margin-bottom:2px;">// ORGANIZER NOTICE</strong>
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
        background-color: #07090E !important;
      }
      .bg-card {
        background-color: #0F172A !important;
        border-color: #1E293B !important;
        box-shadow: 0 25px 60px rgba(0,0,0,0.85) !important;
      }
      .bg-main-cell {
        background-color: #0F172A !important;
      }
      .text-title {
        color: #F8FAFC !important;
      }
      .text-val {
        color: #F1F5F9 !important;
      }
      .box-grid {
        background-color: #1E293B !important;
        border-color: #334155 !important;
      }
      .grid-border {
        border-color: #334155 !important;
      }
      .bg-stub {
        background-color: #0B1120 !important;
      }
      .text-muted {
        color: #94A3B8 !important;
      }
      .box-notice {
        background-color: rgba(56, 189, 248, 0.08) !important;
        color: #E2E8F0 !important;
      }
    }
    @media only screen and (max-width: 600px) {
      .responsive-strip {
        display: block !important;
        width: 100% !important;
      }
      .responsive-col {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .stub-col {
        border-left: none !important;
        border-top: 2px dashed #06B6D4 !important;
      }
    }
  </style>
</head>
<body class="bg-body" style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:36px 12px;">
    
    <!-- Top Cyan Hairline Ribbon -->
    <div style="height:3px;background:linear-gradient(90deg, #06B6D4 0%, #3B82F6 50%, #10B981 100%);border-top-left-radius:10px;border-top-right-radius:10px;"></div>

    <!-- MAIN TICKET CARD CONTAINER (Light by default) -->
    <div class="bg-card" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-bottom-left-radius:10px;border-bottom-right-radius:10px;box-shadow:0 15px 35px rgba(0,0,0,0.06);overflow:hidden;">
      
      <!-- TOP BANNER IMAGE -->
      ${bannerHtml}

      <!-- HORIZONTAL TICKET STRIP BELOW BANNER -->
      <table class="responsive-strip" style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          
          <!-- LEFT MAIN DETAILS STRIP (65% Width) -->
          <td class="responsive-col bg-main-cell" style="width:65%;padding:22px 18px;vertical-align:top;background-color:#FFFFFF;">
            
            <!-- Strip Header -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
              <tr>
                <td>
                  <span style="font-size:9px;font-weight:800;letter-spacing:2.5px;color:#06B6D4;text-transform:uppercase;font-family:'Courier New',monospace;">CRENELLE HORIZON</span>
                </td>
                <td style="text-align:right;">
                  <span style="font-size:8px;font-weight:800;letter-spacing:1px;color:#FFFFFF;background-color:#06B6D4;padding:3px 8px;border-radius:10px;text-transform:uppercase;font-family:-apple-system,sans-serif;">${badgeText}</span>
                </td>
              </tr>
            </table>

            <!-- Title -->
            <h2 class="text-title" style="font-size:20px;line-height:1.2;font-weight:800;color:#0F172A;margin:0 0 12px 0;letter-spacing:-0.4px;">
              ${escapeHtml(event.name)}
            </h2>

            <!-- Horizontal Compact Info Grid (2 Rows x 2 Cols) -->
            <table class="box-grid" style="width:100%;border-collapse:collapse;margin-bottom:12px;background-color:#F1F5F9;border-radius:6px;border:1px solid #E2E8F0;">
              <tr>
                <td class="grid-border" style="padding:10px 10px;border-right:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;width:50%;">
                  <span class="text-muted" style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#64748B;text-transform:uppercase;display:block;font-family:'Courier New',monospace;">WHEN</span>
                  <span class="text-val" style="font-size:11px;font-weight:700;color:#1E293B;display:block;margin-top:2px;">${eventDateFormatted}${timeFormatted ? ` · ${timeFormatted}` : ''}</span>
                </td>
                <td class="grid-border" style="padding:10px 10px;border-bottom:1px solid #E2E8F0;width:50%;">
                  <span class="text-muted" style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#64748B;text-transform:uppercase;display:block;font-family:'Courier New',monospace;">GUEST</span>
                  <span style="font-size:11px;font-weight:700;color:#0284C7;display:block;margin-top:2px;">${escapeHtml(recipientName)} (${partySizeText})</span>
                </td>
              </tr>
              <tr>
                <td class="grid-border" style="padding:10px 10px;border-right:1px solid #E2E8F0;width:50%;">
                  <span class="text-muted" style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#64748B;text-transform:uppercase;display:block;font-family:'Courier New',monospace;">WHERE</span>
                  <span class="text-val" style="font-size:11px;font-weight:700;color:#1E293B;display:block;margin-top:2px;">${escapeHtml(event.venue)}</span>
                </td>
                <td style="padding:10px 10px;width:50%;">
                  <span class="text-muted" style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#64748B;text-transform:uppercase;display:block;font-family:'Courier New',monospace;">SEAT / TIER</span>
                  <span style="font-size:11px;font-weight:700;color:${seatInfo ? '#059669' : '#4F46E5'};display:block;margin-top:2px;">
                    ${seatInfo ? escapeHtml(seatInfo) : (tierName ? escapeHtml(tierName) : 'STANDARD')}
                  </span>
                </td>
              </tr>
            </table>

            ${perksHtml}
            ${customMsgHtml}

          </td>

          <!-- RIGHT QR GATE STUB (35% Width - Perforated Vertical Cutline) -->
          <td class="responsive-col stub-col bg-stub" style="width:35%;padding:16px 10px;vertical-align:middle;background-color:#F8FAFC;border-left:2px dashed #06B6D4;text-align:center;">
            
            <div style="font-size:8px;font-weight:800;letter-spacing:1.5px;color:#06B6D4;text-transform:uppercase;margin-bottom:8px;font-family:'Courier New',monospace;">
              GATE ENTRY STUB
            </div>

            <!-- Compact QR Code -->
            <div style="display:inline-block;padding:6px;background-color:#FFFFFF;border:1px solid #06B6D4;border-radius:4px;box-shadow:0 2px 10px rgba(6, 182, 212, 0.15);max-width:90%;">
              <img src="${qrCidOrSrc}" alt="QR Stub" width="110" height="110" style="display:block;border:none;max-width:100%;height:auto;margin:0 auto;" />
            </div>

            <div class="text-muted" style="margin-top:8px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:1px;color:#64748B;font-weight:700;">
              NO. ${serialNo}
            </div>

            <div style="margin-top:4px;font-size:8px;letter-spacing:1px;color:#94A3B8;text-transform:uppercase;">
              SCANNER VALIDATED
            </div>

          </td>

        </tr>
      </table>

    </div>

    <!-- Micro Footer -->
    <div style="padding:20px 0 10px 0;text-align:center;">
      <p style="font-size:8px;letter-spacing:2px;color:#94A3B8;margin:0 0 4px 0;text-transform:uppercase;font-family:'Courier New',monospace;">
        CRENELLE HORIZON // PANORAMIC_TICKET_STRIP
      </p>
      <p style="font-size:9px;color:#94A3B8;margin:0;">
        <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

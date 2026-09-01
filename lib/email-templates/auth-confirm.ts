/**
 * lib/email-templates/auth-confirm.ts
 *
 * Branded HTML template for Supabase's "Confirm signup" email.
 *
 * HOW TO USE — Supabase Dashboard (Option A):
 * 1. Go to Authentication → Email Templates → "Confirm signup"
 * 2. Set Subject to: "Confirm your Crenelle account"
 * 3. Paste the HTML returned by renderConfirmSignupEmail() into the "Message"
 *    field. Leave the {{ .ConfirmationURL }} placeholder exactly as-is — Supabase
 *    substitutes the real link at send time.
 * 4. Save. Supabase will use this template for all new signup confirmations.
 *
 * You can also use renderConfirmSignupEmail() programmatically if you ever
 * switch to Option B (sending via Resend directly).
 */

/**
 * Returns a complete, self-contained HTML email that can be pasted into the
 * Supabase "Confirm signup" email template or sent via Resend.
 *
 * The {{ .ConfirmationURL }} placeholder is replaced by Supabase at send time.
 * If calling programmatically (Option B), pass the real URL as `confirmationUrl`.
 */
export function renderConfirmSignupEmail({
  confirmationUrl = '{{ .ConfirmationURL }}',
}: {
  confirmationUrl?: string
} = {}): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Confirm your Crenelle account</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F1EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#F4F1EC;padding:48px 16px;">
    <tr>
      <td align="center" valign="top">

        <!-- Email card: max 600px -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#FFFFFF;max-width:600px;width:100%;border:1px solid rgba(12,11,9,0.10);border-radius:4px;overflow:hidden;">

          <!-- ── Top copper accent bar ── -->
          <tr>
            <td style="background:#BF8430;height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── Header ── -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(12,11,9,0.08);">
              <!-- Wordmark -->
              <p style="margin:0 0 6px;font-size:10px;letter-spacing:4px;text-transform:uppercase;
                         color:#BF8430;font-family:'Courier New',Courier,monospace;font-weight:700;">
                CRENELLE
              </p>
              <p style="margin:0;font-size:9px;letter-spacing:3px;text-transform:uppercase;
                         color:#9E9890;font-family:'Courier New',Courier,monospace;">
                SECURITY &amp; TICKETING
              </p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <!-- Icon block -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#FBF8F3;border:1px solid rgba(191,132,48,0.25);
                              border-radius:12px;padding:16px 20px;width:52px;text-align:center;">
                    <!-- Envelope SVG inline (no external image fetch) -->
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#BF8430"
                            stroke-width="1.5"/>
                      <path d="M2 7l10 7 10-7" stroke="#BF8430" stroke-width="1.5"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;
                          font-size:28px;font-weight:600;color:#0C0B09;line-height:1.1;
                          letter-spacing:-0.5px;">
                Confirm your email
              </h1>
              <h2 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',Times,serif;
                          font-size:16px;font-weight:400;color:#BF8430;line-height:1.4;">
                You're one step away from launching events on Crenelle.
              </h2>

              <!-- Body copy -->
              <p style="margin:0 0 32px;font-size:14px;color:#5C5850;line-height:1.75;">
                Click the button below to verify your email address and activate your account.
                This link expires in <strong style="color:#0C0B09;">24 hours</strong>.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#0C0B09;border-radius:100px;">
                    <a href="${confirmationUrl}"
                       style="display:inline-block;padding:15px 36px;font-size:11px;
                              font-family:'Courier New',Courier,monospace;font-weight:700;
                              letter-spacing:3px;text-transform:uppercase;color:#F4F1EC;
                              text-decoration:none;border-radius:100px;">
                      CONFIRM YOUR EMAIL &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback plain URL -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background:#F4F1EC;border-left:3px solid #BF8430;margin:0 0 24px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;
                               text-transform:uppercase;color:#BF8430;
                               font-family:'Courier New',Courier,monospace;font-weight:700;">
                      BUTTON NOT WORKING?
                    </p>
                    <p style="margin:0;font-size:11px;color:#5C5850;line-height:1.6;
                               word-break:break-all;">
                      Copy and paste this link into your browser:<br>
                      <a href="${confirmationUrl}"
                         style="color:#BF8430;text-decoration:none;font-family:'Courier New',Courier,monospace;">
                        ${confirmationUrl}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <p style="margin:0;font-size:12px;color:#9E9890;line-height:1.6;">
                If you didn't create a Crenelle account, you can safely ignore this email.
                No account will be created without confirmation.
              </p>

            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="height:1px;background:rgba(12,11,9,0.06);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 40px;">
              <p style="margin:0;font-size:9px;letter-spacing:3px;text-transform:uppercase;
                         color:#BF8430;text-align:center;font-family:'Courier New',Courier,monospace;">
                CRENELLE // EVENT MANAGEMENT
              </p>
              <p style="margin:6px 0 0;font-size:9px;color:#C4BFB8;text-align:center;
                         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                &copy; 2026 Crenelle Security &amp; Ticketing Services
              </p>
            </td>
          </tr>

        </table>
        <!-- / Email card -->

      </td>
    </tr>
  </table>

</body>
</html>`
}

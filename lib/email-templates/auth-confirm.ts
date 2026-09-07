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
  confirmationUrl,
}: {
  /**
   * Pass the real confirmation URL when sending programmatically via Resend
   * (Option B). When pasting into the Supabase dashboard (Option A), leave
   * this undefined — the template will embed the {{ .ConfirmationURL }}
   * placeholder directly so Supabase substitutes it at send time.
   */
  confirmationUrl?: string
} = {}): string {
  // For Supabase dashboard usage the placeholder must appear verbatim in the
  // rendered HTML so Supabase's Go-template engine can substitute it.
  // For programmatic sends (Resend) the caller provides the real URL.
  const url = confirmationUrl ?? '{{ .ConfirmationURL }}'
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
<body style="margin:0;padding:0;background-color:#F4F1EC;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#F4F1EC;padding:48px 16px;">
    <tr>
      <td align="center" valign="top">

        <!-- Email card container -->
        <table width="560" cellpadding="0" cellspacing="0" border="0"
               style="background:#FFFFFF;max-width:560px;width:100%;border:1px solid rgba(12,11,9,0.08);border-radius:12px;box-shadow:0 8px 30px rgba(12,11,9,0.04);overflow:hidden;">

          <!-- Top copper accent line -->
          <tr>
            <td style="background:#BF8430;height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header / Wordmark -->
          <tr>
            <td style="padding:36px 40px 20px;border-bottom:1px solid rgba(12,11,9,0.06);">
              <span style="font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#BF8430;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;">
                CRENELLE
              </span>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:36px 40px 40px;">

              <!-- Editorial Headline -->
              <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',Times,serif;font-size:26px;font-weight:600;color:#0C0B09;line-height:1.25;letter-spacing:-0.3px;">
                Confirm your account
              </h1>

              <!-- Subtitle -->
              <p style="margin:0 0 28px;font-size:14px;color:#5C5850;line-height:1.65;">
                Welcome to Crenelle. Please verify your email address to complete registration and activate your organizer account.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 36px;">
                <tr>
                  <td style="background:#0C0B09;border-radius:100px;">
                    <a href="${url}"
                       style="display:inline-block;padding:15px 36px;font-size:11px;
                              font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;font-weight:700;
                              letter-spacing:2.5px;text-transform:uppercase;color:#F4F1EC;text-decoration:none;border-radius:100px;">
                      Confirm Email Address &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background:#F9F8F5;border:1px solid rgba(191,132,48,0.18);border-radius:8px;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#BF8430;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;">
                      ALTERNATIVE LINK
                    </p>
                    <p style="margin:0;font-size:12px;color:#5C5850;line-height:1.6;word-break:break-all;">
                      If the button above doesn't work, copy and paste this link into your web browser:<br>
                      <a href="${url}"
                         style="color:#BF8430;text-decoration:underline;line-height:1.8;word-break:break-all;">
                        ${url}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expiration & Security Notice -->
              <p style="margin:0;font-size:12px;color:#9E9890;line-height:1.6;">
                This security link expires in 24 hours. If you didn't create a Crenelle account, you can safely ignore this message.
              </p>

            </td>
          </tr>

          <!-- Footer Divider -->
          <tr>
            <td style="height:1px;background:rgba(12,11,9,0.06);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#FAF8F5;">
              <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#BF8430;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;font-weight:600;">
                CRENELLE &bull; EVENT &amp; TICKETING SERVICES
              </p>
              <p style="margin:6px 0 0;font-size:10px;color:#9E9890;text-align:center;">
                &copy; 2026 Crenelle. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- / Email card container -->

      </td>
    </tr>
  </table>

</body>
</html>`
}

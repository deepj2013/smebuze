const BRAND = '#0284c7';
const BRAND_DARK = '#0369a1';

export function layout(title: string, inner: string, preheader = ''): string {
  const preview = escapeHtml(preheader);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preview}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding:8px 8px 20px 8px;">
              <span style="font-size:20px;font-weight:700;color:${BRAND};letter-spacing:-0.02em;">SMEBUZE</span>
              <span style="display:block;font-size:12px;color:#64748b;margin-top:4px;">GST billing, stock and books for Indian MSMEs</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:32px 28px;border:1px solid #e2e8f0;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 8px 8px;font-size:12px;line-height:1.6;color:#64748b;">
              Sent by SMEBUZE from support@smebuze.com. If you did not expect this mail, you can ignore it — nothing will change on your account.
              <br />Need help? Reply to this email and we will assist you.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">${escapeHtml(label)}</a>`;
}

function otpBox(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="padding:18px 12px;background:#f0f9ff;border:1px dashed ${BRAND};border-radius:12px;text-align:center;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_DARK};font-weight:700;">One-time code</div>
        <div style="font-size:32px;letter-spacing:0.28em;font-weight:700;color:#0f172a;margin-top:10px;font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(code)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:10px;">Valid for 10 minutes. Do not share this code with anyone.</div>
      </td>
    </tr>
  </table>`;
}

export function welcomeVerifyHtml(opts: { name: string; otp: string; verifyUrl: string }): string {
  const name = escapeHtml(opts.name || 'there');
  return layout(
    'Welcome to SMEBUZE',
    `<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;">Welcome, ${name}</h1>
     <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#334155;">Your SMEBUZE workspace is ready. Confirm your email with the 6-digit code below, then you can bill, print and run the shop.</p>
     ${otpBox(opts.otp)}
     <p style="margin:0 0 16px 0;font-size:14px;color:#475569;">Prefer the website? Open the page and paste the same code:</p>
     <p style="margin:0 0 8px 0;">${button(opts.verifyUrl, 'Confirm email')}</p>
     <p style="margin:20px 0 0 0;font-size:13px;color:#64748b;">If the button does not work, copy this link:<br /><span style="word-break:break-all;color:${BRAND};">${escapeHtml(opts.verifyUrl)}</span></p>`,
    `Your SMEBUZE code is ${opts.otp}. Valid for 10 minutes.`,
  );
}

export function otpHtml(opts: { name: string; otp: string; reason: string }): string {
  const name = escapeHtml(opts.name || 'there');
  return layout(
    'Your SMEBUZE code',
    `<h1 style="margin:0 0 12px 0;font-size:22px;">Hello ${name}</h1>
     <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(opts.reason)}</p>
     ${otpBox(opts.otp)}
     <p style="margin:0;font-size:13px;color:#64748b;">If you did not request this code, you can ignore this mail.</p>`,
    `Your SMEBUZE code is ${opts.otp}. Valid for 10 minutes.`,
  );
}

export function passwordResetHtml(opts: { name: string; otp: string; resetLink: string }): string {
  const name = escapeHtml(opts.name || 'there');
  return layout(
    'Reset your SMEBUZE password',
    `<h1 style="margin:0 0 12px 0;font-size:22px;">Reset your password</h1>
     <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#334155;">Hi ${name}, we received a request to reset the password for your SMEBUZE account. Use the 6-digit code on the website, or click the button to choose a new password.</p>
     ${otpBox(opts.otp)}
     <p style="margin:0 0 16px 0;font-size:14px;color:#475569;">Prefer a link? This button is valid for 24 hours.</p>
     <p style="margin:0;">${button(opts.resetLink, 'Choose a new password')}</p>
     <p style="margin:20px 0 0 0;font-size:13px;color:#64748b;">If you did not ask for this, ignore the mail. Your password stays the same.</p>`,
    `Your password reset code is ${opts.otp}. Valid for 10 minutes.`,
  );
}

export function inviteHtml(opts: { inviteLink: string }): string {
  return layout(
    'You are invited to SMEBUZE',
    `<h1 style="margin:0 0 12px 0;font-size:22px;">Join your team on SMEBUZE</h1>
     <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">You have been invited to a workspace. Set your password to start billing, stock and reports with your team.</p>
     <p style="margin:0;">${button(opts.inviteLink, 'Accept invite')}</p>
     <p style="margin:20px 0 0 0;font-size:13px;color:#64748b;">This link expires in 72 hours. If you were not expecting an invite, you can ignore this mail.</p>`,
    'You have been invited to a SMEBUZE workspace.',
  );
}

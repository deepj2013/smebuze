import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Send password reset email. In development returns the link for testing.
   * In production, set SENDGRID_API_KEY or SMTP_* env to actually send.
   */
  async sendPasswordReset(to: string, resetLink: string): Promise<{ sent: boolean; devLink?: string }> {
    if (this.config.get('NODE_ENV') !== 'production') {
      console.log(`[Mail] Password reset for ${to}: ${resetLink}`);
      return { sent: true, devLink: resetLink };
    }
    const apiKey = this.config.get('SENDGRID_API_KEY');
    if (apiKey) {
      try {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.config.get('MAIL_FROM') || 'noreply@smebuzz.com', name: 'SMEBUZE' },
            subject: 'Reset your SMEBUZE password',
            content: [{ type: 'text/plain', value: `Click to reset your password: ${resetLink}\n\nThis link expires in 24 hours.` }],
          }),
        });
        return { sent: true };
      } catch (e) {
        console.error('[Mail] SendGrid error:', e);
        return { sent: false };
      }
    }
    console.log('[Mail] No SENDGRID_API_KEY set; reset link not sent to', to);
    return { sent: false };
  }

  /**
   * Send invite email with join link. In development logs the link.
   */
  async sendInvite(to: string, inviteLink: string): Promise<{ sent: boolean; devLink?: string }> {
    if (this.config.get('NODE_ENV') !== 'production') {
      console.log(`[Mail] Invite for ${to}: ${inviteLink}`);
      return { sent: true, devLink: inviteLink };
    }
    const apiKey = this.config.get('SENDGRID_API_KEY');
    if (apiKey) {
      try {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.config.get('MAIL_FROM') || 'noreply@smebuzz.com', name: 'SMEBUZE' },
            subject: 'You\'re invited to join SMEBUZE',
            content: [{ type: 'text/plain', value: `Join your team on SMEBUZE: ${inviteLink}\n\nThis link expires in 72 hours.` }],
          }),
        });
        return { sent: true };
      } catch (e) {
        console.error('[Mail] SendGrid error:', e);
        return { sent: false };
      }
    }
    console.log('[Mail] No SENDGRID_API_KEY set; invite link not sent to', to);
    return { sent: false };
  }
}

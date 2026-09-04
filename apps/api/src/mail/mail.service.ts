import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { inviteHtml, otpHtml, passwordResetHtml, welcomeVerifyHtml } from './templates';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter | null {
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');
    if (!user || !pass) return null;
    if (this.transporter) return this.transporter;
    const port = parseInt(this.config.get('MAIL_PORT') || '465', 10);
    const secure = this.config.get('MAIL_SECURE') !== 'false';
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST') || 'smtp.hostinger.com',
      port,
      secure,
      auth: { user, pass },
    });
    return this.transporter;
  }

  private from(): string {
    return this.config.get('MAIL_FROM') || 'SMEBUZE <support@smebuze.com>';
  }

  async sendHtml(
    to: string,
    subject: string,
    html: string,
    text?: string,
    extras?: { replyTo?: string },
  ): Promise<{ sent: boolean }> {
    const transport = this.getTransporter();
    if (!transport) {
      this.log.warn(`SMTP not configured; skip mail to ${to}: ${subject}`);
      return { sent: false };
    }
    try {
      await transport.sendMail({
        from: this.from(),
        to,
        subject,
        html,
        text: text || subject,
        replyTo: extras?.replyTo,
      });
      this.log.log(`Sent "${subject}" to ${to}`);
      return { sent: true };
    } catch (err) {
      this.log.error(`Failed to send to ${to}`, err instanceof Error ? err.stack : String(err));
      return { sent: false };
    }
  }

  private logOtpIfDev(to: string, otp: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.log.warn(`Dev OTP for ${to}: ${otp}`);
    }
  }

  async sendWelcomeVerify(to: string, name: string, otp: string, verifyUrl: string): Promise<{ sent: boolean }> {
    const result = await this.sendHtml(
      to,
      'Welcome to SMEBUZE — confirm your email',
      welcomeVerifyHtml({ name, otp, verifyUrl }),
      `Welcome to SMEBUZE. Your confirmation code is ${otp}. It is valid for 10 minutes. Or open: ${verifyUrl}`,
    );
    if (!result.sent) this.logOtpIfDev(to, otp);
    return result;
  }

  async sendOtp(to: string, name: string, otp: string, reason: string): Promise<{ sent: boolean }> {
    const result = await this.sendHtml(
      to,
      'Your SMEBUZE verification code',
      otpHtml({ name, otp, reason }),
      `${reason} Your code is ${otp}. It is valid for 10 minutes.`,
    );
    if (!result.sent) this.logOtpIfDev(to, otp);
    return result;
  }

  async sendPasswordReset(to: string, name: string, otp: string, resetLink: string): Promise<{ sent: boolean; devLink?: string }> {
    const sent = await this.sendHtml(
      to,
      'Reset your SMEBUZE password',
      passwordResetHtml({ name, otp, resetLink }),
      `Reset your SMEBUZE password. Code: ${otp} (10 minutes). Or open this link within 24 hours: ${resetLink}`,
    );
    if (!sent.sent) {
      this.logOtpIfDev(to, otp);
      return { sent: false, devLink: resetLink };
    }
    return { sent: true };
  }

  async sendInvite(
    to: string,
    inviteLink: string,
    extras?: { roleName?: string; workspaceName?: string },
  ): Promise<{ sent: boolean; devLink?: string }> {
    const sent = await this.sendHtml(
      to,
      extras?.workspaceName ? `You are invited to join ${extras.workspaceName}` : 'You are invited to join SMEBUZE',
      inviteHtml({ inviteLink, roleName: extras?.roleName, workspaceName: extras?.workspaceName }),
    );
    if (!sent.sent) return { sent: false, devLink: inviteLink };
    return { sent: true };
  }
}

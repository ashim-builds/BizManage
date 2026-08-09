import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { emailTemplates, EmailTemplatePayload } from './templates.js';

export interface SentEmailRecord {
  to: string;
  subject: string;
  templateName: string;
  sentAt: Date;
  payload: EmailTemplatePayload;
}

class EmailService {
  private transporter: Transporter | null = null;
  private sentEmailLog: SentEmailRecord[] = [];

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (env.SMTP_HOST && env.SMTP_HOST.trim() !== '') {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: env.SMTP_USER
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASSWORD || '',
              }
            : undefined,
        });
      } catch (_err) {
        // Handle transporter creation errors safely without leaking credentials
        this.transporter = null;
      }
    }
  }

  /**
   * Safely dispatches an email via SMTP or records to in-memory audit log for testing/dev fallback.
   * Internal errors and SMTP credentials are scrubbed and never exposed.
   */
  async sendMail(to: string, templateName: string, template: EmailTemplatePayload): Promise<boolean> {
    const record: SentEmailRecord = {
      to,
      subject: template.subject,
      templateName,
      sentAt: new Date(),
      payload: template,
    };

    // Store in internal audit log
    this.sentEmailLog.push(record);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
          to,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        return true;
      } catch (_err) {
        // Safe SMTP error handling: Do not throw internal stack traces or leak credentials
        return false;
      }
    }

    return true;
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmailLog];
  }

  clearSentEmails(): void {
    this.sentEmailLog = [];
  }

  // Specialized dispatch helpers
  async sendVerificationOtp(to: string, name: string, otp: string, expiresMinutes = 10): Promise<boolean> {
    const payload = emailTemplates.verificationOtp({ name, otp, expiresMinutes });
    return this.sendMail(to, 'verification-otp', payload);
  }

  async sendWelcome(to: string, name: string, businessName?: string): Promise<boolean> {
    const payload = emailTemplates.welcome({ name, businessName });
    return this.sendMail(to, 'welcome', payload);
  }

  async sendForgotPassword(to: string, name: string, resetLink: string): Promise<boolean> {
    const payload = emailTemplates.forgotPassword({ name, resetLink });
    return this.sendMail(to, 'forgot-password', payload);
  }

  async sendPasswordChanged(to: string, name: string, timestamp: string): Promise<boolean> {
    const payload = emailTemplates.passwordChanged({ name, timestamp });
    return this.sendMail(to, 'password-changed', payload);
  }

  async sendSecurityLogin(
    to: string,
    name: string,
    ipAddress?: string,
    userAgent?: string,
    timestamp = new Date().toISOString()
  ): Promise<boolean> {
    const payload = emailTemplates.securityLogin({ name, ipAddress, userAgent, timestamp });
    return this.sendMail(to, 'security-login', payload);
  }

  async sendUserInvitation(
    to: string,
    name: string,
    businessName: string,
    role: string,
    inviteLink: string
  ): Promise<boolean> {
    const payload = emailTemplates.userInvitation({ name, businessName, role, inviteLink });
    return this.sendMail(to, 'user-invitation', payload);
  }

  async sendInvoiceNotification(
    to: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    date: string,
    businessName: string
  ): Promise<boolean> {
    const payload = emailTemplates.invoiceNotification({
      customerName,
      invoiceNumber,
      amount,
      date,
      businessName,
    });
    return this.sendMail(to, 'invoice-notification', payload);
  }

  async sendPaymentNotification(
    to: string,
    partyName: string,
    paymentType: 'RECEIVED' | 'MADE',
    amount: number,
    date: string,
    referenceNumber?: string,
    businessName = 'BizManage'
  ): Promise<boolean> {
    const payload = emailTemplates.paymentNotification({
      partyName,
      paymentType,
      amount,
      date,
      referenceNumber,
      businessName,
    });
    return this.sendMail(to, 'payment-notification', payload);
  }

  async sendReturnRefundNotification(
    to: string,
    partyName: string,
    returnNumber: string,
    refundAmount: number,
    date: string,
    businessName = 'BizManage'
  ): Promise<boolean> {
    const payload = emailTemplates.returnRefundNotification({
      partyName,
      returnNumber,
      refundAmount,
      date,
      businessName,
    });
    return this.sendMail(to, 'return-refund-notification', payload);
  }
}

export const emailService = new EmailService();

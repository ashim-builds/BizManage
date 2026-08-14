import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
} else {
  console.warn('⚠️ SMTP credentials are not fully configured. Emails will be logged to console instead of being sent.');
}

export async function sendVerificationEmail(toEmail: string, otpCode: string): Promise<void> {
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Verify your BizManage Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Welcome to BizManage!</h2>
        <p style="color: #475569; font-size: 16px;">
          Thank you for registering. To complete your account setup and verify your email address, please use the following One-Time Password (OTP):
        </p>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${otpCode}</span>
        </div>
        <p style="color: #475569; font-size: 14px;">
          This code is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          If you did not request this email, you can safely ignore it.
        </p>
      </div>
    `,
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('\n================== EMAIL MOCK (SMTP SUCCESS) =================');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Verify your BizManage Account`);
      console.log(`OTP Code: ${otpCode}`);
      console.log('==============================================================\n');
    } catch (error) {
      console.error('Failed to send verification email via SMTP:', error);
      console.log('\n================== EMAIL MOCK (SMTP FAILED) ==================');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Verify your BizManage Account`);
      console.log(`OTP Code: ${otpCode}`);
      console.log('==============================================================\n');
      throw new Error('Failed to send verification email');
    }
  } else {
    // Development fallback
    console.log('\n================== EMAIL MOCK ==================');
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Verify your BizManage Account`);
    console.log(`OTP Code: ${otpCode}`);
    console.log('================================================\n');
  }
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<void> {
  const resetLink = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Reset your BizManage Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 16px;">
          We received a request to reset your password. Click the button below to choose a new one:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        <p style="color: #475569; font-size: 14px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #3b82f6; word-break: break-all;">${resetLink}</a>
        </p>
        <p style="color: #475569; font-size: 14px; margin-top: 24px;">
          This link is valid for <strong>1 hour</strong>.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>
    `,
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('\n================== EMAIL MOCK (SMTP SUCCESS) =================');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Reset your BizManage Password`);
      console.log(`Reset Link: [REDACTED FOR SECURITY]`);
      console.log('==============================================================\n');
    } catch (error) {
      console.error('Failed to send password reset email via SMTP:', error);
      console.log('\n================== EMAIL MOCK (SMTP FAILED) ==================');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Reset your BizManage Password`);
      console.log(`Reset Link: [REDACTED FOR SECURITY]`);
      console.log('==============================================================\n');
      throw new Error('Failed to send password reset email');
    }
  } else {
    // Development fallback
    console.log('\n================== EMAIL MOCK ==================');
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Reset your BizManage Password`);
    console.log(`Reset Link: [REDACTED FOR SECURITY]`);
    console.log('================================================\n');
  }
}

export async function sendPasswordChangedEmail(toEmail: string): Promise<void> {
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Security Alert: Your password was changed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Password Changed</h2>
        <p style="color: #475569; font-size: 16px;">
          This is a confirmation that the password for your BizManage account has just been changed.
        </p>
        <p style="color: #475569; font-size: 14px; margin-top: 24px;">
          If you made this change, you don't need to do anything.
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 16px; border-radius: 6px; margin-top: 24px;">
          <p style="color: #991b1b; font-size: 14px; margin: 0;">
            <strong>Didn't change your password?</strong><br/>
            Your account may have been compromised. Please contact your system administrator or support immediately.
          </p>
        </div>
      </div>
    `,
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('\n================== EMAIL MOCK (SMTP SUCCESS) =================');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Security Alert: Your password was changed`);
      console.log('==============================================================\n');
    } catch (error) {
      console.error('Failed to send password changed email via SMTP:', error);
      console.log('\n================== EMAIL MOCK (SMTP FAILED) ==================');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Security Alert: Your password was changed`);
      console.log('==============================================================\n');
    }
  } else {
    // Development fallback
    console.log('\n================== EMAIL MOCK ==================');
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Security Alert: Your password was changed`);
    console.log('================================================\n');
  }
}

export async function sendNewLoginEmail(toEmail: string, ip: string): Promise<void> {
  if (!transporter) return;
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Security Alert: New Login to BizManage',
    html: `<p>We noticed a new login to your BizManage account from IP: ${ip}. If this wasn't you, please reset your password immediately.</p>`,
  };
  transporter.sendMail(mailOptions).catch(err => console.error('Failed to send login email', err));
}

export async function sendGoogleConnectedEmail(toEmail: string): Promise<void> {
  if (!transporter) return;
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Security Alert: Google Account Connected',
    html: `<p>A Google account was just connected to your BizManage profile. If you did not do this, please contact support.</p>`,
  };
  transporter.sendMail(mailOptions).catch(err => console.error('Failed to send Google connect email', err));
}

export async function sendGoogleDisconnectedEmail(toEmail: string): Promise<void> {
  if (!transporter) return;
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Security Alert: Google Account Disconnected',
    html: `<p>Your Google account was disconnected from BizManage.</p>`,
  };
  transporter.sendMail(mailOptions).catch(err => console.error('Failed to send Google disconnect email', err));
}

export async function sendSuspiciousLoginEmail(toEmail: string): Promise<void> {
  if (!transporter) return;
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: 'Security Alert: Suspicious Login Attempts',
    html: `<p>We detected multiple failed login attempts on your account. Your account has been temporarily locked for 15 minutes. If this was not you, someone may be trying to guess your password.</p>`,
  };
  transporter.sendMail(mailOptions).catch(err => console.error('Failed to send suspicious login email', err));
}

export async function sendSubscriptionExpiringEmail(toEmail: string, businessName: string, daysLeft: number): Promise<void> {
  if (!transporter) return;
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: `Action Required: Your BizManage Subscription expires in ${daysLeft} days`,
    html: `<p>Dear ${businessName} owner,</p><p>Your BizManage subscription will expire in ${daysLeft} days. Please renew to continue uninterrupted access.</p>`,
  };
  transporter.sendMail(mailOptions).catch(err => console.error('Failed to send expiring subscription email', err));
}

export async function sendSubscriptionExpiredEmail(toEmail: string, businessName: string): Promise<void> {
  if (!transporter) return;
  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: toEmail,
    subject: `Notice: Your BizManage Subscription has Expired`,
    html: `<p>Dear ${businessName} owner,</p><p>Your BizManage subscription has expired. Your account has been suspended and access is restricted. Please renew to restore access.</p>`,
  };
  transporter.sendMail(mailOptions).catch(err => console.error('Failed to send expired subscription email', err));
}

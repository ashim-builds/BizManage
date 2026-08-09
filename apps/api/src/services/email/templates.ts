export interface EmailTemplatePayload {
  subject: string;
  html: string;
  text: string;
}

export const emailTemplates = {
  // 1. VERIFICATION OTP
  verificationOtp(data: { name: string; otp: string; expiresMinutes: number }): EmailTemplatePayload {
    return {
      subject: `${data.otp} is your BizManage verification code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3b82f6; margin: 0;">BizManage</h1>
            <p style="color: #94a3b8; font-size: 14px;">Business Management Platform</p>
          </div>
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.name},</p>
            <p style="color: #cbd5e1; font-size: 15px;">Thank you for registering with BizManage. Please use the following 6-digit verification code to complete your registration:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 28px; border-radius: 8px; font-family: monospace;">${data.otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This OTP will expire in ${data.expiresMinutes} minutes. If you did not request this verification code, please ignore this email.</p>
          </div>
        </div>
      `,
      text: `Hello ${data.name},\n\nYour BizManage verification code is: ${data.otp}\n\nThis code will expire in ${data.expiresMinutes} minutes.\nIf you did not request this code, please ignore this email.`,
    };
  },

  // 2. WELCOME EMAIL
  welcome(data: { name: string; businessName?: string }): EmailTemplatePayload {
    return {
      subject: `Welcome to BizManage, ${data.name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3b82f6; margin: 0;">BizManage</h1>
          </div>
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Email Verified Successfully! 🎉</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.name},</p>
            <p style="color: #cbd5e1; font-size: 15px;">Welcome to BizManage! Your email address has been verified successfully${data.businessName ? ` for <strong>${data.businessName}</strong>` : ''}.</p>
            <p style="color: #cbd5e1; font-size: 15px;">You now have full access to manage your inventory, sales invoices, party ledgers, and cash flow reports.</p>
          </div>
        </div>
      `,
      text: `Welcome to BizManage, ${data.name}!\n\nYour email address has been verified successfully${data.businessName ? ` for ${data.businessName}` : ''}.\n\nYou can now log in and manage your business platform.`,
    };
  },

  // 3. FORGOT PASSWORD
  forgotPassword(data: { name: string; resetLink: string }): EmailTemplatePayload {
    return {
      subject: `Password Reset Request - BizManage`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3b82f6; margin: 0;">BizManage</h1>
          </div>
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.name},</p>
            <p style="color: #cbd5e1; font-size: 15px;">We received a request to reset your password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${data.resetLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This link will expire in 15 minutes. If you did not request a password reset, please secure your account immediately.</p>
          </div>
        </div>
      `,
      text: `Hello ${data.name},\n\nWe received a request to reset your password.\n\nReset Link: ${data.resetLink}\n\nThis link will expire in 15 minutes.`,
    };
  },

  // 4. PASSWORD CHANGED
  passwordChanged(data: { name: string; timestamp: string }): EmailTemplatePayload {
    return {
      subject: `Security Alert: Your Password Was Changed - BizManage`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #ef4444; font-size: 20px; margin-top: 0;">Password Changed</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.name},</p>
            <p style="color: #cbd5e1; font-size: 15px;">Your BizManage account password was successfully updated on <strong>${data.timestamp}</strong>.</p>
            <p style="color: #94a3b8; font-size: 13px;">If you performed this change, no further action is required. All active sessions have been revoked for your protection.</p>
            <p style="color: #f87171; font-size: 13px;">If you did NOT change your password, please contact support immediately.</p>
          </div>
        </div>
      `,
      text: `Hello ${data.name},\n\nYour BizManage account password was updated on ${data.timestamp}.\nIf you did not initiate this change, contact support immediately.`,
    };
  },

  // 5. SECURITY LOGIN NOTIFICATION
  securityLogin(data: { name: string; ipAddress?: string; userAgent?: string; timestamp: string }): EmailTemplatePayload {
    return {
      subject: `New Login to Your BizManage Account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #3b82f6; font-size: 20px; margin-top: 0;">New Account Login Detected</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.name},</p>
            <p style="color: #cbd5e1; font-size: 15px;">We detected a new successful login to your account with the following details:</p>
            <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              <li><strong>Time:</strong> ${data.timestamp}</li>
              <li><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</li>
              <li><strong>Device / Agent:</strong> ${data.userAgent || 'Unknown'}</li>
            </ul>
            <p style="color: #94a3b8; font-size: 13px;">If this was you, you can safely ignore this email.</p>
          </div>
        </div>
      `,
      text: `Hello ${data.name},\n\nNew login detected on ${data.timestamp}.\nIP: ${data.ipAddress || 'Unknown'}\nDevice: ${data.userAgent || 'Unknown'}`,
    };
  },

  // 6. USER INVITATION
  userInvitation(data: { name: string; businessName: string; role: string; inviteLink: string }): EmailTemplatePayload {
    return {
      subject: `You've been invited to join ${data.businessName} on BizManage`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #3b82f6; font-size: 20px; margin-top: 0;">Team Invitation</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.name},</p>
            <p style="color: #cbd5e1; font-size: 15px;">You have been invited to join <strong>${data.businessName}</strong> as a <strong>${data.role}</strong>.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${data.inviteLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            </div>
          </div>
        </div>
      `,
      text: `Hello ${data.name},\n\nYou have been invited to join ${data.businessName} as a ${data.role}.\n\nAccept Link: ${data.inviteLink}`,
    };
  },

  // 7. INVOICE NOTIFICATION
  invoiceNotification(data: { customerName: string; invoiceNumber: string; amount: number; date: string; businessName: string }): EmailTemplatePayload {
    return {
      subject: `Invoice ${data.invoiceNumber} from ${data.businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #3b82f6; font-size: 20px; margin-top: 0;">Invoice Issued</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Dear ${data.customerName},</p>
            <p style="color: #cbd5e1; font-size: 15px;">An invoice has been generated for your recent purchase at <strong>${data.businessName}</strong>.</p>
            <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">Invoice Number: <strong style="color: #ffffff;">${data.invoiceNumber}</strong></p>
              <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">Date: <strong style="color: #ffffff;">${data.date}</strong></p>
              <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">Total Amount: <strong style="color: #10b981; font-size: 18px;">NPR ${data.amount.toLocaleString()}</strong></p>
            </div>
          </div>
        </div>
      `,
      text: `Dear ${data.customerName},\n\nInvoice ${data.invoiceNumber} has been issued by ${data.businessName}.\nDate: ${data.date}\nTotal: NPR ${data.amount}`,
    };
  },

  // 8. PAYMENT NOTIFICATION
  paymentNotification(data: { partyName: string; paymentType: 'RECEIVED' | 'MADE'; amount: number; date: string; referenceNumber?: string; businessName: string }): EmailTemplatePayload {
    const actionText = data.paymentType === 'RECEIVED' ? 'Payment Receipt Confirmation' : 'Payment Dispatched Confirmation';
    return {
      subject: `${actionText} - ${data.businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #10b981; font-size: 20px; margin-top: 0;">${actionText}</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.partyName},</p>
            <p style="color: #cbd5e1; font-size: 15px;">This email confirms that a payment of <strong>NPR ${data.amount.toLocaleString()}</strong> was recorded on ${data.date}.</p>
            ${data.referenceNumber ? `<p style="color: #94a3b8; font-size: 13px;">Reference #: ${data.referenceNumber}</p>` : ''}
          </div>
        </div>
      `,
      text: `Hello ${data.partyName},\n\n${actionText}.\nAmount: NPR ${data.amount}\nDate: ${data.date}`,
    };
  },

  // 9. RETURN / REFUND NOTIFICATION
  returnRefundNotification(data: { partyName: string; returnNumber: string; refundAmount: number; date: string; businessName: string }): EmailTemplatePayload {
    return {
      subject: `Return Credit Note ${data.returnNumber} - ${data.businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #f59e0b; font-size: 20px; margin-top: 0;">Return Credit Note</h2>
            <p style="color: #cbd5e1; font-size: 15px;">Hello ${data.partyName},</p>
            <p style="color: #cbd5e1; font-size: 15px;">A return note <strong>${data.returnNumber}</strong> has been processed for <strong>NPR ${data.refundAmount.toLocaleString()}</strong> on ${data.date}.</p>
          </div>
        </div>
      `,
      text: `Hello ${data.partyName},\n\nReturn note ${data.returnNumber} processed for NPR ${data.refundAmount} on ${data.date}.`,
    };
  },
};

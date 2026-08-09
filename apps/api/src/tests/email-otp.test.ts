import { buildApp } from '../app.js';
import { globalPrisma } from '@bizmanage/database';
import { emailService } from '../services/email/email.service.js';

export async function runEmailOtpTests() {
  console.log('🧪 [TEST SUITE 4/4] Running SMTP Email System & 6-Digit Registration OTP Tests...');

  const app = buildApp();
  await app.ready();

  const testEmail = `otp.user.${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // Clear previous test email dispatches
  emailService.clearSentEmails();

  // ── 1. REGISTRATION CREATES PENDING (UNVERIFIED) ACCOUNT ────────────────────
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'OTP Verified User',
      email: testEmail,
      password: testPassword,
      businessName: 'OTP Testing Ltd',
    },
  });

  if (regRes.statusCode !== 201) {
    throw new Error(`Registration failed: ${regRes.body}`);
  }

  const regBody = JSON.parse(regRes.body);
  if (regBody.data.accessToken || regBody.data.otp || regBody.data.token) {
    throw new Error('SECURITY VIOLATION: OTP or access token exposed before email verification!');
  }

  console.log('   ✅ Registration Created Unverified Account & Dispatched OTP Email');

  // Verify OTP email sent to memory transport log
  const sentEmails = emailService.getSentEmails();
  const otpEmail = sentEmails.find((e) => e.to === testEmail && e.templateName === 'verification-otp');

  if (!otpEmail) {
    throw new Error('Verification OTP email was not dispatched via SMTP service');
  }

  // Extract raw OTP from email subject/text for automated test assertion
  const otpMatch = otpEmail.payload.text.match(/code is: (\d{6})/);
  if (!otpMatch || !otpMatch[1]) {
    throw new Error('Could not parse 6-digit OTP from verification email');
  }
  const realOtp = otpMatch[1];
  console.log('   ✅ 6-Digit OTP Email Format Verified');

  // ── 2. LOGIN BLOCKED FOR UNVERIFIED EMAIL ──────────────────────────────────
  const unverifiedLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: testEmail,
      password: testPassword,
    },
  });

  if (unverifiedLoginRes.statusCode !== 403) {
    throw new Error(`Expected 403 EMAIL_NOT_VERIFIED for unverified account, got ${unverifiedLoginRes.statusCode}`);
  }
  console.log('   ✅ Unverified Account Login Correctly Blocked (HTTP 403)');

  // ── 3. INCORRECT OTP REJECTED ──────────────────────────────────────────────
  const wrongOtpRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-otp',
    payload: {
      email: testEmail,
      otp: '000000',
    },
  });

  if (wrongOtpRes.statusCode !== 400) {
    throw new Error(`Expected 400 for incorrect OTP, got ${wrongOtpRes.statusCode}`);
  }
  console.log('   ✅ Incorrect OTP Correctly Rejected');

  // ── 4. RESEND OTP INVALIDATES PRIOR OTP ────────────────────────────────────
  emailService.clearSentEmails();
  const resendRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/resend-otp',
    payload: { email: testEmail },
  });

  if (resendRes.statusCode !== 200) {
    throw new Error(`Resend OTP failed: ${resendRes.body}`);
  }

  const newSentEmails = emailService.getSentEmails();
  const newOtpEmail = newSentEmails.find((e) => e.to === testEmail && e.templateName === 'verification-otp');
  if (!newOtpEmail) {
    throw new Error('Resent OTP email was not dispatched');
  }

  const newOtpMatch = newOtpEmail.payload.text.match(/code is: (\d{6})/);
  const newOtp = newOtpMatch![1];

  // Old OTP should now be rejected (invalidated by resend)
  const oldOtpTryRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-otp',
    payload: { email: testEmail, otp: realOtp },
  });

  if (oldOtpTryRes.statusCode !== 400) {
    throw new Error('Old OTP worked after resending a new OTP!');
  }
  console.log('   ✅ Resend OTP Successfully Invalidated Prior OTP');

  // ── 5. VERIFY OTP WITH CORRECT CODE ───────────────────────────────────────
  emailService.clearSentEmails();
  const verifyRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-otp',
    payload: {
      email: testEmail,
      otp: newOtp,
    },
  });

  if (verifyRes.statusCode !== 200) {
    throw new Error(`OTP verification failed: ${verifyRes.body}`);
  }

  const verifyBody = JSON.parse(verifyRes.body);
  if (!verifyBody.data.accessToken || !verifyBody.data.user.isEmailVerified) {
    throw new Error('Verification response missing access token or isEmailVerified flag');
  }

  // Check Welcome Email Dispatched
  const welcomeEmail = emailService.getSentEmails().find((e) => e.to === testEmail && e.templateName === 'welcome');
  if (!welcomeEmail) {
    throw new Error('Welcome email was not dispatched upon successful OTP verification');
  }

  console.log('   ✅ OTP Verification Passed & Welcome Email Dispatched');

  // ── 6. REUSE OF VERIFIED OTP REJECTED (SINGLE-USE) ─────────────────────────
  const reuseOtpRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-otp',
    payload: {
      email: testEmail,
      otp: newOtp,
    },
  });

  if (reuseOtpRes.statusCode !== 400) {
    throw new Error(`Expected 400 when reusing verified OTP, got ${reuseOtpRes.statusCode}`);
  }
  console.log('   ✅ Single-Use OTP Enforcement Verified');

  // ── 7. VERIFIED USER CAN LOGIN & RECEIVES SECURITY LOGIN EMAIL ──────────────
  emailService.clearSentEmails();
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: testEmail,
      password: testPassword,
    },
  });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Verified user login failed: ${loginRes.body}`);
  }

  const loginSecurityEmail = emailService.getSentEmails().find((e) => e.to === testEmail && e.templateName === 'security-login');
  if (!loginSecurityEmail) {
    throw new Error('Security login notification email was not dispatched');
  }
  console.log('   ✅ Verified User Login Passed & Security Login Email Dispatched');

  // ── 8. MAX ATTEMPTS EXCEEDED LOCKOUT ──────────────────────────────────────
  const lockoutEmail = `lockout.${Date.now()}@example.com`;
  const lockoutReg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Lockout User',
      email: lockoutEmail,
      password: testPassword,
      businessName: 'Lockout Corp',
    },
  });
  const lockoutUserId = JSON.parse(lockoutReg.body).data.userId;

  // Set maxAttempts = 3 on the active OTP record
  await globalPrisma.emailVerificationOtp.updateMany({
    where: { userId: lockoutUserId, used: false },
    data: { maxAttempts: 3 },
  });

  // Attempt wrong OTP 3 times
  for (let i = 0; i < 3; i++) {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { email: lockoutEmail, otp: '999999' },
    });
  }

  // 4th attempt should fail with max attempts error
  const maxAttemptRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-otp',
    payload: { email: lockoutEmail, otp: '999999' },
  });

  if (maxAttemptRes.statusCode !== 400 || !maxAttemptRes.body.includes('Maximum verification attempts exceeded')) {
    throw new Error(`Expected max attempts error, got: ${maxAttemptRes.body}`);
  }
  console.log('   ✅ Maximum Verification Attempt Lockout Passed');

  // ── 9. TRANSACTION EMAIL NOTIFICATION (INVOICE EMAIL) ─────────────────────
  emailService.clearSentEmails();
  const token = JSON.parse(loginRes.body).data.accessToken;
  const bizId = JSON.parse(loginRes.body).data.businesses[0].id;
  const headers = { authorization: `Bearer ${token}`, 'x-business-id': bizId };

  // Create party with email
  const partyRes = await app.inject({
    method: 'POST',
    url: '/api/v1/parties',
    headers,
    payload: {
      name: 'Email Customer',
      type: 'CUSTOMER',
      email: 'customer@example.com',
    },
  });
  const partyId = JSON.parse(partyRes.body).data.id;

  // Create item
  const itemRes = await app.inject({
    method: 'POST',
    url: '/api/v1/items',
    headers,
    payload: { name: 'Email Test Widget', salePrice: 1500, purchasePrice: 1000, openingStock: 50 },
  });
  const itemId = JSON.parse(itemRes.body).data.id;

  // Create sale
  await app.inject({
    method: 'POST',
    url: '/api/v1/sales',
    headers,
    payload: {
      partyId,
      date: new Date().toISOString(),
      items: [{ itemId, quantity: 2, unitPrice: 1500 }],
      paidAmount: 3000,
    },
  });

  const invoiceEmail = emailService.getSentEmails().find((e) => e.to === 'customer@example.com' && e.templateName === 'invoice-notification');
  if (!invoiceEmail) {
    throw new Error('Invoice notification email was not dispatched for sale creation');
  }
  console.log('   ✅ Invoice Notification Email Dispatched');

  // ── 10. SAFE SMTP ERROR HANDLING ──────────────────────────────────────────
  const sendResult = await emailService.sendMail('faulty@example.com', 'test', {
    subject: 'Test',
    html: '<p>Test</p>',
    text: 'Test',
  });
  if (typeof sendResult !== 'boolean') {
    throw new Error('sendMail did not return boolean status');
  }
  console.log('   ✅ Safe Error Handling for SMTP Failures Passed');

  await app.close();
  console.log('   🎉 ALL SMTP EMAIL & REGISTRATION OTP TESTS PASSED SUCCESSFULLY!');
}

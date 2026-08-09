import { buildApp } from '../app.js';
import { globalPrisma } from '@bizmanage/database';
import crypto from 'crypto';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function runAuthTests() {
  console.log('🧪 [TEST SUITE 1/4] Running Hardened Authentication & Session Tests...');

  const app = buildApp();
  await app.ready();

  const testEmail = `auth.test.${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const newPassword = 'NewPassword456!';

  // ── 1. USER REGISTRATION ──────────────────────────────────────────────────
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Auth Hardened User',
      email: testEmail,
      password: testPassword,
      businessName: 'Hardened Security Corp',
    },
  });

  if (regRes.statusCode !== 201) {
    throw new Error(`Auth registration failed: ${regRes.body}`);
  }

  const regBody = JSON.parse(regRes.body);
  if (!regBody.success || !regBody.data.userId) {
    throw new Error('Registration response missing user payload');
  }

  // Verify zero sensitive data exposure in response body
  if (regBody.data.passwordHash || regBody.data.resetToken || regBody.data.refreshToken || regBody.data.accessToken) {
    throw new Error('SECURITY VIOLATION: Sensitive auth fields or access token exposed before email verification!');
  }

  // Verify email directly to allow login test cases to proceed
  await globalPrisma.user.update({
    where: { id: regBody.data.userId },
    data: { isEmailVerified: true },
  });

  console.log('   ✅ User Registration & Business Setup Passed');

  // ── 2. LOGIN WITH INVALID & VALID CREDENTIALS ──────────────────────────────
  // 2a. Failed Login
  const failLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: testEmail,
      password: 'WrongPassword!',
    },
  });

  if (failLoginRes.statusCode !== 401) {
    throw new Error(`Expected 401 for invalid password, got ${failLoginRes.statusCode}`);
  }

  // 2b. Successful Login
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: testEmail,
      password: testPassword,
    },
  });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Auth login failed: ${loginRes.body}`);
  }

  const loginBody = JSON.parse(loginRes.body);
  const accessToken = loginBody.data.accessToken;
  if (!accessToken) {
    throw new Error('Login response missing access token');
  }

  const loginCookie = loginRes.cookies.find((c) => c.name === 'refreshToken')?.value;
  if (!loginCookie) {
    throw new Error('Login failed to set refreshToken cookie');
  }

  console.log('   ✅ Argon2id Login & JWT Issuance Passed');

  // ── 3. LOGIN HISTORY AUDITING ──────────────────────────────────────────────
  const historyRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/login-history',
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (historyRes.statusCode !== 200) {
    throw new Error(`Failed to fetch login history: ${historyRes.body}`);
  }

  const historyData = JSON.parse(historyRes.body).data;
  if (!Array.isArray(historyData) || historyData.length < 2) {
    throw new Error('Login history did not record expected login attempts');
  }

  const failedRecord = historyData.find((h: any) => h.status === 'FAILED');
  const successRecord = historyData.find((h: any) => h.status === 'SUCCESS');
  if (!failedRecord || !successRecord) {
    throw new Error('Login history missing FAILED or SUCCESS attempt log records');
  }

  console.log('   ✅ Login History Audit Logging Passed');

  // ── 4. PROTECTED /ME ENDPOINT ─────────────────────────────────────────────
  const meRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (meRes.statusCode !== 200) {
    throw new Error(`Auth /me failed: ${meRes.body}`);
  }
  const meData = JSON.parse(meRes.body).data;
  if (meData.passwordHash || meData.jwtSecret) {
    throw new Error('SECURITY VIOLATION: Sensitive user properties leaked in /me endpoint');
  }
  console.log('   ✅ Protected Auth /me Endpoint Passed');

  // ── 5. ACTIVE SESSIONS MANAGEMENT & REVOCATION ─────────────────────────────
  // 5a. Fetch Active Sessions
  const sessionsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/sessions',
    headers: {
      authorization: `Bearer ${accessToken}`,
      cookie: `refreshToken=${loginCookie}`,
    },
  });

  if (sessionsRes.statusCode !== 200) {
    throw new Error(`Failed to fetch active sessions: ${sessionsRes.body}`);
  }

  const sessionsList = JSON.parse(sessionsRes.body).data;
  if (!Array.isArray(sessionsList) || sessionsList.length === 0) {
    throw new Error('Sessions list is empty');
  }

  const currentSession = sessionsList.find((s: any) => s.isCurrent);
  if (!currentSession) {
    throw new Error('Sessions list failed to identify current session');
  }

  console.log('   ✅ Active Session Management List Passed');

  // 5b. Revoke Specific Session
  // Create a second session by logging in again
  const secondLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: testEmail, password: testPassword },
  });
  const secondCookie = secondLoginRes.cookies.find((c) => c.name === 'refreshToken')?.value;

  const updatedSessionsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/sessions',
    headers: {
      authorization: `Bearer ${accessToken}`,
      cookie: `refreshToken=${secondCookie}`,
    },
  });
  const updatedList = JSON.parse(updatedSessionsRes.body).data;
  const targetSessionToRevoke = updatedList.find((s: any) => !s.isCurrent);

  if (targetSessionToRevoke) {
    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/auth/sessions/${targetSessionToRevoke.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (revokeRes.statusCode !== 200) {
      throw new Error(`Failed to revoke session: ${revokeRes.body}`);
    }
    console.log('   ✅ Individual Session Revocation Passed');
  }

  // ── 6. LOGOUT CURRENT SESSION ──────────────────────────────────────────────
  const logoutRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    headers: { cookie: `refreshToken=${secondCookie}` },
  });

  if (logoutRes.statusCode !== 200) {
    throw new Error(`Logout failed: ${logoutRes.body}`);
  }

  // Verify session cookie cleared
  const logoutCookieHeader = logoutRes.headers['set-cookie'];
  if (!logoutCookieHeader || typeof logoutCookieHeader !== 'string' || !logoutCookieHeader.includes('refreshToken=;')) {
    throw new Error('Logout response did not clear refreshToken cookie');
  }

  // Verify session removed from DB
  const deletedSession = await globalPrisma.session.findUnique({
    where: { tokenHash: hashToken(secondCookie!) },
  });
  if (deletedSession) {
    throw new Error('Revoked session still exists in database');
  }

  console.log('   ✅ Session Revocation & Cookie Clear on Logout Passed');

  // ── 7. CHANGE PASSWORD REQUIRING OLD PASSWORD ──────────────────────────────
  // 7a. Reject wrong current password
  const wrongCurrentPwRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/change-password',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      currentPassword: 'WrongOldPassword!',
      newPassword: newPassword,
      confirmPassword: newPassword,
    },
  });

  if (wrongCurrentPwRes.statusCode !== 401) {
    throw new Error(`Expected 401 for wrong current password, got ${wrongCurrentPwRes.statusCode}`);
  }

  // 7b. Reject non-matching confirmation password
  const mismatchPwRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/change-password',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      currentPassword: testPassword,
      newPassword: newPassword,
      confirmPassword: 'DifferentPassword!',
    },
  });

  if (mismatchPwRes.statusCode !== 400) {
    throw new Error(`Expected 400 for password mismatch, got ${mismatchPwRes.statusCode}`);
  }

  // 7c. Successful password change (invalidates all sessions)
  const changePwRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/change-password',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      currentPassword: testPassword,
      newPassword: newPassword,
      confirmPassword: newPassword,
    },
  });

  if (changePwRes.statusCode !== 200) {
    throw new Error(`Change password failed: ${changePwRes.body}`);
  }

  // Verify old password no longer works
  const oldLoginFail = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: testEmail, password: testPassword },
  });
  if (oldLoginFail.statusCode !== 401) {
    throw new Error('Old password still worked after change password!');
  }

  // Login with new password
  const newLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: testEmail, password: newPassword },
  });
  if (newLoginRes.statusCode !== 200) {
    throw new Error('Login with new password failed after change password');
  }
  const newAccessToken = JSON.parse(newLoginRes.body).data.accessToken;

  console.log('   ✅ Change Password & Old Password Validation Passed');

  // ── 8. FORGOT PASSWORD & RESET PASSWORD FLOW ──────────────────────────────
  // 8a. Request forgot password
  const forgotRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/forgot-password',
    payload: { email: testEmail },
  });

  if (forgotRes.statusCode !== 200) {
    throw new Error(`Forgot password request failed: ${forgotRes.body}`);
  }

  const forgotBody = JSON.parse(forgotRes.body);
  if (forgotBody.data.resetToken || forgotBody.data.token) {
    throw new Error('SECURITY VIOLATION: Reset token exposed in API response body!');
  }

  // Generate a test token and store hash directly to test reset handler
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const testResetTokenHash = hashToken(rawResetToken);
  const dbUser = await globalPrisma.user.findUnique({ where: { email: testEmail } });

  await globalPrisma.passwordResetToken.create({
    data: {
      userId: dbUser!.id,
      tokenHash: testResetTokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      used: false,
    },
  });

  // 8b. Reset password using token
  const finalPassword = 'FinalSecurePassword789!';
  const resetRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/reset-password',
    payload: {
      token: rawResetToken,
      newPassword: finalPassword,
    },
  });

  if (resetRes.statusCode !== 200) {
    throw new Error(`Reset password failed: ${resetRes.body}`);
  }

  // 8c. Verify token single-use (attempt reuse)
  const reuseRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/reset-password',
    payload: {
      token: rawResetToken,
      newPassword: 'AnotherPassword123!',
    },
  });

  if (reuseRes.statusCode !== 400) {
    throw new Error(`Expected 400 when attempting to reuse reset token, got ${reuseRes.statusCode}`);
  }

  // 8d. Verify expired token rejection
  const expiredRawToken = crypto.randomBytes(32).toString('hex');
  await globalPrisma.passwordResetToken.create({
    data: {
      userId: dbUser!.id,
      tokenHash: hashToken(expiredRawToken),
      expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
      used: false,
    },
  });

  const expiredRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/reset-password',
    payload: {
      token: expiredRawToken,
      newPassword: 'ExpiredPassword123!',
    },
  });

  if (expiredRes.statusCode !== 400) {
    throw new Error(`Expected 400 for expired reset token, got ${expiredRes.statusCode}`);
  }

  console.log('   ✅ Secure Single-Use Expiring Password Reset Passed');

  // ── 9. LOGOUT ALL SESSIONS ─────────────────────────────────────────────────
  const logoutAllRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout-all',
    headers: { authorization: `Bearer ${newAccessToken}` },
  });

  if (logoutAllRes.statusCode !== 200) {
    throw new Error(`Logout all failed: ${logoutAllRes.body}`);
  }

  const remainingSessions = await globalPrisma.session.findMany({
    where: { userId: dbUser!.id },
  });
  if (remainingSessions.length > 0) {
    throw new Error('Logout all failed to purge user sessions');
  }

  console.log('   ✅ Logout All Sessions Passed');

  await app.close();
  console.log('   🎉 ALL AUTHENTICATION HARDENING TESTS PASSED SUCCESSFULLY!');
}

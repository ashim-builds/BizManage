import { buildApp } from '../app.js';
import { globalPrisma } from '@bizmanage/database';

export async function runGoogleOAuthTests() {
  console.log('\n🧪 [TEST SUITE 5/5] Running Google OAuth Authentication & Account Linking Tests...');

  const app = await buildApp();
  await app.ready();

  const testPassword = 'TestPassword123!';

  // ── 1. GENERATE GOOGLE AUTHORIZATION URL ─────────────────────────────────
  const urlRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/google/url',
  });

  if (urlRes.statusCode !== 200) {
    throw new Error(`Expected 200 for Google auth URL, got ${urlRes.statusCode}`);
  }

  const urlData = JSON.parse(urlRes.body).data;
  if (!urlData.url || !urlData.url.includes('accounts.google.com') || !urlData.state) {
    throw new Error('Google OAuth URL or state parameter missing');
  }
  console.log('   ✅ Google Authorization URL Generation & State Cookie Verified');

  // ── 2. NEW USER REGISTRATION VIA GOOGLE ──────────────────────────────────
  const newGoogleEmail = `google.new.${Date.now()}@example.com`;
  const googleRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/google/callback',
    payload: {
      code: `test_code_${Date.now()}`,
      state: urlData.state,
    },
  });

  if (googleRes.statusCode !== 200) {
    throw new Error(`Expected 200 for Google OAuth callback registration, got ${googleRes.statusCode}: ${googleRes.body}`);
  }

  const googleData = JSON.parse(googleRes.body).data;
  const newGoogleUser = await globalPrisma.user.findUnique({
    where: { id: googleData.user.id },
    include: { memberships: true },
  });

  if (!newGoogleUser || !newGoogleUser.googleId || !newGoogleUser.isEmailVerified || newGoogleUser.passwordHash !== null) {
    throw new Error('New Google user schema state invalid (expected googleId, isEmailVerified=true, passwordHash=null)');
  }
  if (newGoogleUser.memberships.length === 0) {
    throw new Error('Business tenant workspace was not automatically created for new Google user');
  }
  console.log('   ✅ New User Registration via Google OAuth Passed (Verified + Business Created)');

  // ── 3. LOCKOUT PREVENTION: DISCONNECT GOOGLE WITHOUT PASSWORD ──────────────
  const googleToken = googleData.accessToken;
  const lockoutDisconnectRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/google/disconnect',
    headers: { authorization: `Bearer ${googleToken}` },
  });

  if (lockoutDisconnectRes.statusCode !== 400 || !lockoutDisconnectRes.body.includes('LOCKOUT_PREVENTION')) {
    throw new Error(`Expected HTTP 400 LOCKOUT_PREVENTION when disconnecting Google with no password set, got ${lockoutDisconnectRes.statusCode}: ${lockoutDisconnectRes.body}`);
  }
  console.log('   ✅ Lockout Prevention Verified (Blocked disconnecting Google when no password set)');

  // ── 4. EXISTING EMAIL USER + GOOGLE ACCOUNT LINKING ──────────────────────
  const existingEmail = `existing.email.${Date.now()}@example.com`;
  // Create an email/password user via normal registration
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Existing Email User',
      email: existingEmail,
      password: testPassword,
      businessName: 'Existing Business',
    },
  });
  const existingUserId = JSON.parse(regRes.body).data.userId;

  // Now simulate user completing Google OAuth with matching email
  const linkRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/google/callback',
    payload: {
      code: `test_code_existing_${existingEmail}`,
    },
  });

  // Verify code returned success
  if (linkRes.statusCode !== 200) {
    throw new Error(`Expected 200 when linking Google to existing email user, got ${linkRes.statusCode}: ${linkRes.body}`);
  }

  // ── 5. DUPLICATE ACCOUNT PREVENTION ──────────────────────────────────────
  const usersWithEmail = await globalPrisma.user.findMany({
    where: { email: existingEmail },
  });

  if (usersWithEmail.length !== 1) {
    throw new Error(`Expected exactly 1 user for email ${existingEmail}, found ${usersWithEmail.length} (Duplicate Account Detected!)`);
  }

  const linkedUser = usersWithEmail[0]!;
  if (!linkedUser.googleId || !linkedUser.isEmailVerified || !linkedUser.passwordHash) {
    throw new Error('Existing user was not properly linked with googleId while retaining passwordHash');
  }
  console.log('   ✅ Account Linking & Duplicate Prevention Passed (Linked Google ID to Existing User)');

  // ── 6. DISCONNECT GOOGLE WHEN PASSWORD SET ───────────────────────────────
  const existingToken = JSON.parse(linkRes.body).data.accessToken;
  const safeDisconnectRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/google/disconnect',
    headers: { authorization: `Bearer ${existingToken}` },
  });

  if (safeDisconnectRes.statusCode !== 200) {
    throw new Error(`Expected 200 when disconnecting Google with password set, got ${safeDisconnectRes.statusCode}`);
  }

  const unlinkedUser = await globalPrisma.user.findUnique({ where: { id: existingUserId } });
  if (unlinkedUser?.googleId !== null) {
    throw new Error('googleId was not cleared upon Google account disconnect');
  }
  console.log('   ✅ Google Account Disconnect Passed (Safe disconnect when password exists)');

  // ── 7. INVALID OAUTH CODE REJECTION ─────────────────────────────────────
  const invalidRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/google/callback',
    payload: {
      code: 'test_code_invalid',
    },
  });

  if (invalidRes.statusCode !== 400 || !invalidRes.body.includes('INVALID_OAUTH_CODE')) {
    throw new Error(`Expected HTTP 400 INVALID_OAUTH_CODE for invalid code, got ${invalidRes.statusCode}`);
  }
  console.log('   ✅ Invalid OAuth Response Rejection Verified');

  await app.close();
  console.log('   🎉 ALL GOOGLE OAUTH & ACCOUNT LINKING TESTS PASSED SUCCESSFULLY!\n');
}

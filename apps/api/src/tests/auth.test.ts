import { buildApp } from '../app.js';

export async function runAuthTests() {
  console.log('🧪 [TEST SUITE 1/4] Running Authentication & Session Tests...');

  const app = buildApp();
  await app.ready();

  const timestamp = Date.now();
  const testEmail = `auth.test.${timestamp}@example.com`;
  const validPassword = 'StrongPassword123!';

  // 1. Test Missing Fields
  const missingFieldRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Test User',
      email: testEmail,
      // missing password & businessName
    },
  });
  if (missingFieldRes.statusCode !== 400) {
    throw new Error(`Expected HTTP 400 for missing fields, got ${missingFieldRes.statusCode}`);
  }
  console.log('   ✅ Missing Fields Validation Test Passed');

  // 2. Test Invalid Email Format
  const invalidEmailRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Test User',
      email: 'not-an-email',
      password: validPassword,
      businessName: 'Test Business',
    },
  });
  if (invalidEmailRes.statusCode !== 400) {
    throw new Error(`Expected HTTP 400 for invalid email, got ${invalidEmailRes.statusCode}`);
  }
  console.log('   ✅ Invalid Email Format Validation Test Passed');

  // 3. Test Weak Password Policy
  const weakPasswordRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Test User',
      email: `weak.${timestamp}@example.com`,
      password: 'password123', // missing uppercase & special char
      businessName: 'Test Business',
    },
  });
  if (weakPasswordRes.statusCode !== 400) {
    throw new Error(`Expected HTTP 400 for weak password, got ${weakPasswordRes.statusCode}`);
  }
  console.log('   ✅ Weak Password Policy Enforcement Test Passed');

  // 4. Test Valid Registration
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Auth Test User',
      email: testEmail,
      password: validPassword,
      businessName: 'Auth Test Corp',
    },
  });

  if (regRes.statusCode !== 201) {
    throw new Error(`Auth registration failed: ${regRes.body}`);
  }

  const regBody = JSON.parse(regRes.body);
  const regData = regBody.data;

  // Verify response fields and data privacy (no passwordHash or plaintext password)
  if (!regData.accessToken || !regData.user.id || !regData.business.id) {
    throw new Error('Auth registration response missing required tokens or IDs');
  }
  if (regData.user.isVerified !== false) {
    throw new Error('New registered account should have isVerified set to false');
  }
  if (regData.user.passwordHash || regData.user.password) {
    throw new Error('API response exposed sensitive password data!');
  }
  console.log('   ✅ Valid User Registration & Unverified Default Status Passed');

  // 5. Test Duplicate Email Account Prevention
  const dupRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Duplicate User',
      email: testEmail.toUpperCase(), // Case insensitive duplicate check
      password: validPassword,
      businessName: 'Duplicate Corp',
    },
  });

  if (dupRes.statusCode !== 409) {
    throw new Error(`Expected HTTP 409 Conflict for duplicate email, got ${dupRes.statusCode}`);
  }
  console.log('   ✅ Duplicate Email Account Prevention Passed');

  // 6. Test User Login
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: testEmail,
      password: validPassword,
    },
  });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Auth login failed: ${loginRes.body}`);
  }

  const loginData = JSON.parse(loginRes.body).data;
  if (!loginData.accessToken) {
    throw new Error('Login response missing access token');
  }
  console.log('   ✅ User Login & Session Creation Passed');

  // 7. Test Protected /me Endpoint
  const meRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { authorization: `Bearer ${loginData.accessToken}` },
  });

  if (meRes.statusCode !== 200) {
    throw new Error(`Auth /me failed: ${meRes.body}`);
  }
  const meData = JSON.parse(meRes.body).data;
  if (meData.isVerified !== false) {
    throw new Error('/me endpoint reported incorrect verification status');
  }
  console.log('   ✅ Protected Auth /me Endpoint Passed');

  // 8. Test Rate Limiting on Repeated Registration Attempts
  let hitRateLimit = false;
  for (let i = 0; i < 10; i++) {
    const rateLimitAttempt = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: `Rate Limit User ${i}`,
        email: `ratelimit.${i}.${timestamp}@example.com`,
        password: validPassword,
        businessName: `Rate Limit Corp ${i}`,
      },
    });

    if (rateLimitAttempt.statusCode === 429) {
      hitRateLimit = true;
      break;
    }
  }

  if (!hitRateLimit) {
    throw new Error('Registration rate limit did not trigger HTTP 429 after max attempts');
  }
  console.log('   ✅ Registration Rate Limiting Enforcement Passed');

  await app.close();
}

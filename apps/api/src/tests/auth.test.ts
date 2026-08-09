import { buildApp } from '../app.js';

export async function runAuthTests() {
  console.log('🧪 [TEST SUITE 1/4] Running Authentication & Session Tests...');

  const app = buildApp();
  await app.ready();

  const testEmail = `auth.test.${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // 1. Register User & Business
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Auth Test User',
      email: testEmail,
      password: testPassword,
      businessName: 'Auth Test Corp',
    },
  });

  if (regRes.statusCode !== 201) {
    throw new Error(`Auth registration failed: ${regRes.body}`);
  }

  const regData = JSON.parse(regRes.body).data;
  if (!regData.accessToken || !regData.user.id || !regData.business.id) {
    throw new Error('Auth registration response missing required tokens or IDs');
  }
  console.log('   ✅ User Registration & Business Creation Passed');

  // 2. Login User
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

  const loginData = JSON.parse(loginRes.body).data;
  if (!loginData.accessToken) {
    throw new Error('Login response missing access token');
  }
  console.log('   ✅ User Login & JWT Session Verification Passed');

  // 3. Get Current User Me Endpoint
  const meRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { authorization: `Bearer ${loginData.accessToken}` },
  });

  if (meRes.statusCode !== 200) {
    throw new Error(`Auth /me failed: ${meRes.body}`);
  }
  console.log('   ✅ Protected Auth /me Endpoint Passed');

  await app.close();
}

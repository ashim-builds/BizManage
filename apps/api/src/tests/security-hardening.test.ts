import { buildApp } from '../app.js';
import { globalPrisma } from '@bizmanage/database';

export async function runSecurityHardeningTests() {
  console.log('\n🧪 [TEST SUITE 6/6] Running Security Hardening, IDOR & Multi-Tenant Authorization Audit Tests...');

  const app = await buildApp();
  await app.ready();

  const testPassword = 'SecurityPassword123!';

  // ── 1. UNAUTHORIZED REQUEST REJECTION (Missing/Invalid Token) ──────────────
  const unauthRes = await app.inject({
    method: 'GET',
    url: '/api/v1/parties',
  });

  if (unauthRes.statusCode !== 401) {
    throw new Error(`Expected HTTP 401 for unauthenticated request, got ${unauthRes.statusCode}`);
  }
  console.log('   ✅ Unauthorized Request Rejection Verified (HTTP 401)');

  // ── 2. SETUP TENANT A (User A) & TENANT B (User B) ────────────────────────
  const emailA = `tenant.a.${Date.now()}@example.com`;
  const emailB = `tenant.b.${Date.now()}@example.com`;

  // Register Tenant A
  const regA = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Owner A', email: emailA, password: testPassword, businessName: 'Tenant A Corp' },
  });
  const userIdA = JSON.parse(regA.body).data.userId;

  // Verify OTP for User A
  const otpRecordA = await globalPrisma.emailVerificationOtp.findFirst({ where: { userId: userIdA } });
  const rawOtpA = await globalPrisma.emailVerificationOtp.findFirst({ where: { userId: userIdA } });
  await globalPrisma.user.update({ where: { id: userIdA }, data: { isEmailVerified: true } });

  const loginA = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: emailA, password: testPassword },
  });
  const tokenA = JSON.parse(loginA.body).data.accessToken;
  const bizIdA = JSON.parse(loginA.body).data.businesses[0].id;
  const headersA = { authorization: `Bearer ${tokenA}`, 'x-business-id': bizIdA };

  // Register Tenant B
  const regB = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Owner B', email: emailB, password: testPassword, businessName: 'Tenant B Corp' },
  });
  const userIdB = JSON.parse(regB.body).data.userId;
  await globalPrisma.user.update({ where: { id: userIdB }, data: { isEmailVerified: true } });

  const loginB = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: emailB, password: testPassword },
  });
  const tokenB = JSON.parse(loginB.body).data.accessToken;
  const bizIdB = JSON.parse(loginB.body).data.businesses[0].id;
  const headersB = { authorization: `Bearer ${tokenB}`, 'x-business-id': bizIdB };

  // Create Party & Item under Tenant B
  const partyBRes = await app.inject({
    method: 'POST',
    url: '/api/v1/parties',
    headers: headersB,
    payload: { name: 'Secret Supplier B', type: 'SUPPLIER', phone: '9800000002' },
  });
  const partyIdB = JSON.parse(partyBRes.body).data.id;

  const itemBRes = await app.inject({
    method: 'POST',
    url: '/api/v1/items',
    headers: headersB,
    payload: { name: 'Secret Widget B', salePrice: 5000, purchasePrice: 3000, openingStock: 100 },
  });
  const itemIdB = JSON.parse(itemBRes.body).data.id;

  // Create Sale under Tenant B
  const saleBRes = await app.inject({
    method: 'POST',
    url: '/api/v1/sales',
    headers: headersB,
    payload: {
      partyId: partyIdB,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdB, quantity: 1, unitPrice: 5000 }],
      paidAmount: 5000,
    },
  });
  const saleIdB = JSON.parse(saleBRes.body).data.id;

  // ── 3. CROSS-TENANT IDOR ISOLATION CHECKS ────────────────────────────────
  // User A attempts to view Tenant B's party
  const crossPartyRes = await app.inject({
    method: 'GET',
    url: `/api/v1/parties/${partyIdB}`,
    headers: headersA,
  });
  if (crossPartyRes.statusCode !== 404) {
    throw new Error(`Expected HTTP 404 for IDOR party access attempt, got ${crossPartyRes.statusCode}`);
  }

  // User A attempts to view Tenant B's item
  const crossItemRes = await app.inject({
    method: 'GET',
    url: `/api/v1/items/${itemIdB}`,
    headers: headersA,
  });
  if (crossItemRes.statusCode !== 404) {
    throw new Error(`Expected HTTP 404 for IDOR item access attempt, got ${crossItemRes.statusCode}`);
  }

  // User A attempts to view Tenant B's sale invoice
  const crossSaleRes = await app.inject({
    method: 'GET',
    url: `/api/v1/sales/${saleIdB}`,
    headers: headersA,
  });
  if (crossSaleRes.statusCode !== 404) {
    throw new Error(`Expected HTTP 404 for IDOR sale access attempt, got ${crossSaleRes.statusCode}`);
  }

  // User A attempts to delete Tenant B's party
  const crossDeletePartyRes = await app.inject({
    method: 'DELETE',
    url: `/api/v1/parties/${partyIdB}`,
    headers: headersA,
  });
  if (crossDeletePartyRes.statusCode !== 404) {
    throw new Error(`Expected HTTP 404 for IDOR delete party attempt, got ${crossDeletePartyRes.statusCode}`);
  }
  console.log('   ✅ Cross-Tenant IDOR Protection Verified (Strict HTTP 404 for Cross-Tenant Lookups & Edits)');

  // ── 4. UNAUTHORIZED TENANT HEADER SPOOFING ────────────────────────────────
  const spoofHeaderRes = await app.inject({
    method: 'GET',
    url: '/api/v1/parties',
    headers: { authorization: `Bearer ${tokenA}`, 'x-business-id': bizIdB },
  });
  if (spoofHeaderRes.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 for unauthorized business header spoofing, got ${spoofHeaderRes.statusCode}`);
  }
  console.log('   ✅ Tenant Header Spoofing Protection Verified (HTTP 403 FORBIDDEN)');

  // ── 5. FRONTEND TOTAL TAMPERING / SERVER RECALCULATION ──────────────
  // Create party & item under Tenant A
  const partyARes = await app.inject({
    method: 'POST',
    url: '/api/v1/parties',
    headers: headersA,
    payload: { name: 'Customer A', type: 'CUSTOMER', phone: '9800000001' },
  });
  const partyIdA = JSON.parse(partyARes.body).data.id;

  const itemARes = await app.inject({
    method: 'POST',
    url: '/api/v1/items',
    headers: headersA,
    payload: { name: 'Laptop A', salePrice: 1000, purchasePrice: 500, openingStock: 50 },
  });
  const itemIdA = JSON.parse(itemARes.body).data.id;

  // Submit sale with tampered totalAmount = 10 (frontend hack attempt)
  const tamperedSaleRes = await app.inject({
    method: 'POST',
    url: '/api/v1/sales',
    headers: headersA,
    payload: {
      partyId: partyIdA,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdA, quantity: 5, unitPrice: 1000 }],
      totalAmount: 10, // Frontend attempt to force total = Rs. 10
      paidAmount: 0,
    },
  });

  if (tamperedSaleRes.statusCode !== 201) {
    throw new Error(`Expected HTTP 201 for sale creation, got ${tamperedSaleRes.statusCode}: ${tamperedSaleRes.body}`);
  }

  const saleData = JSON.parse(tamperedSaleRes.body).data;
  if (Number(saleData.totalAmount) !== 5000 || Number(saleData.dueAmount) !== 5000) {
    throw new Error(`Server failed to override tampered frontend total (expected 5000, got ${saleData.totalAmount})`);
  }
  console.log('   ✅ Server Financial Recalculation & Tamper Override Verified (1000 x 5 = 5000 calculated server-side)');

  // ── 6. RBAC ROLE PERMISSION ENFORCEMENT ─────────────────────────────────
  const memberEmail = `member.a.${Date.now()}@example.com`;
  const memberReg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Member Staff', email: memberEmail, password: testPassword, businessName: 'Dummy' },
  });
  const memberUserId = JSON.parse(memberReg.body).data.userId;

  // Add MemberStaff to Tenant A with role = 'BILLER'
  await globalPrisma.userBusinessRole.create({
    data: { userId: memberUserId, businessId: bizIdA, role: 'BILLER' },
  });
  await globalPrisma.user.update({ where: { id: memberUserId }, data: { isEmailVerified: true } });

  const memberLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: memberEmail, password: testPassword },
  });
  const memberToken = JSON.parse(memberLogin.body).data.accessToken;
  const memberHeaders = { authorization: `Bearer ${memberToken}`, 'x-business-id': bizIdA };

  // Member (BILLER) attempts to update business settings
  const memberSettingsRes = await app.inject({
    method: 'PUT',
    url: '/api/v1/businesses/current/settings',
    headers: memberHeaders,
    payload: { enableTax: true, taxRate: 13 },
  });
  if (memberSettingsRes.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 FORBIDDEN when BILLER attempts to update business settings, got ${memberSettingsRes.statusCode}`);
  }

  // Member (BILLER) attempts to backup/export business data
  const memberBackupRes = await app.inject({
    method: 'GET',
    url: '/api/v1/utilities/backup',
    headers: memberHeaders,
  });
  if (memberBackupRes.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 FORBIDDEN when BILLER attempts to download backup data, got ${memberBackupRes.statusCode}`);
  }
  console.log('   ✅ RBAC Permission Enforcement Verified (BILLER role blocked from Admin settings & backup)');

  // ── 7. SECURITY HEADERS VERIFICATION ────────────────────────────────────
  const headerCheckRes = await app.inject({
    method: 'GET',
    url: '/health',
  });
  if (
    headerCheckRes.headers['x-content-type-options'] !== 'nosniff' ||
    headerCheckRes.headers['x-frame-options'] !== 'DENY' ||
    headerCheckRes.headers['x-xss-protection'] !== '1; mode=block'
  ) {
    throw new Error('Security headers missing or invalid in server response');
  }
  console.log('   ✅ Security Headers Verified (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)');

  await app.close();
  console.log('   🎉 ALL SECURITY HARDENING & AUTHORIZATION AUDIT TESTS PASSED SUCCESSFULLY!\n');
}

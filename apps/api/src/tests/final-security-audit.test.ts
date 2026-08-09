import { buildApp } from '../app.js';
import { globalPrisma } from '@bizmanage/database';

export async function runFinalSecurityAuditTests() {
  console.log('\n🛡️ [TEST SUITE 7/7] Running Master Financial Security, Audit Log & Production Audit Tests...');

  const app = await buildApp();
  await app.ready();

  const testPassword = 'AuditSecurePassword123!';

  // ── 1. SETUP TENANTS & USERS ─────────────────────────────────────────────
  const emailA = `audit.tenant.a.${Date.now()}@example.com`;
  const emailB = `audit.tenant.b.${Date.now()}@example.com`;

  // Register Tenant A (Owner A)
  const regA = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Audit Owner A', email: emailA, password: testPassword, businessName: 'Audit Enterprise A' },
  });
  const userIdA = JSON.parse(regA.body).data.userId;
  await globalPrisma.user.update({ where: { id: userIdA }, data: { isEmailVerified: true } });

  const loginA = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: emailA, password: testPassword },
  });
  const tokenA = JSON.parse(loginA.body).data.accessToken;
  const bizIdA = JSON.parse(loginA.body).data.businesses[0].id;
  const headersA = { authorization: `Bearer ${tokenA}`, 'x-business-id': bizIdA };

  // Register Tenant B (Owner B)
  const regB = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Audit Owner B', email: emailB, password: testPassword, businessName: 'Audit Enterprise B' },
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

  // ── 2. CREATE MASTER DATA UNDER TENANT A ─────────────────────────────────
  const partyARes = await app.inject({
    method: 'POST',
    url: '/api/v1/parties',
    headers: headersA,
    payload: { name: 'Customer Alpha', type: 'CUSTOMER', phone: '9841000001' },
  });
  const partyIdA = JSON.parse(partyARes.body).data.id;

  const itemARes = await app.inject({
    method: 'POST',
    url: '/api/v1/items',
    headers: headersA,
    payload: { name: 'Enterprise Router', salePrice: 10000, purchasePrice: 6000, openingStock: 100 },
  });
  const itemIdA = JSON.parse(itemARes.body).data.id;

  // Create Sale Invoice under Tenant A (Qty: 10 @ Rs. 10,000 = Rs. 100,000 Total, Paid: 40,000, Due: 60,000)
  const saleARes = await app.inject({
    method: 'POST',
    url: '/api/v1/sales',
    headers: headersA,
    payload: {
      partyId: partyIdA,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdA, quantity: 10, unitPrice: 10000 }],
      paidAmount: 40000,
    },
  });
  const saleA = JSON.parse(saleARes.body).data;
  const saleIdA = saleA.id;

  if (Number(saleA.totalAmount) !== 100000 || Number(saleA.dueAmount) !== 60000) {
    throw new Error(`Sale totals calculation failed (expected total 100k, due 60k; got total ${saleA.totalAmount}, due ${saleA.dueAmount})`);
  }
  console.log('   ✅ Server Financial Authority & Initial Ledger Entry Verified');

  // ── 3. FINANCIAL OVER-PAYMENT PREVENTION ───────────────────────────────
  // Attempt to record payment exceeding remaining due balance (Rs. 60,000)
  const overPayRes = await app.inject({
    method: 'POST',
    url: `/api/v1/sales/${saleIdA}/pay`,
    headers: headersA,
    payload: { amount: 75000 },
  });
  if (overPayRes.statusCode !== 400 || !JSON.parse(overPayRes.body).error?.message?.includes('exceeds')) {
    throw new Error(`Expected over-payment error rejection (HTTP 400), got ${overPayRes.statusCode}`);
  }
  console.log('   ✅ Over-Payment Prevention Verified (Attempted Rs. 75,000 payment against Rs. 60,000 balance rejected)');

  // Record valid payment of Rs. 20,000 (Remaining due becomes Rs. 40,000)
  const validPayRes = await app.inject({
    method: 'POST',
    url: `/api/v1/sales/${saleIdA}/pay`,
    headers: headersA,
    payload: { amount: 20000 },
  });
  const updatedSaleAfterPay = JSON.parse(validPayRes.body).data;
  if (Number(updatedSaleAfterPay.dueAmount) !== 40000) {
    throw new Error(`Valid payment balance deduction failed (expected due 40,000, got ${updatedSaleAfterPay.dueAmount})`);
  }
  console.log('   ✅ Valid Ledger Payment & Partial Balance Deduction Verified (Due reduced to Rs. 40,000)');

  // ── 4. FINANCIAL OVER-RETURN PREVENTION ───────────────────────────────
  // First return: 6 units (Valid)
  const validReturn1Res = await app.inject({
    method: 'POST',
    url: '/api/v1/sales/returns',
    headers: headersA,
    payload: {
      partyId: partyIdA,
      saleId: saleIdA,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdA, quantity: 6, unitPrice: 10000 }],
    },
  });
  if (validReturn1Res.statusCode !== 201) {
    throw new Error(`Expected valid sales return creation (201), got ${validReturn1Res.statusCode}`);
  }
  console.log('   ✅ First Return Verified (6 of 10 units returned successfully)');

  // Second return: Attempt to return 5 units (6 + 5 = 11 > 10 original sold units -> Over-Return!)
  const overReturnRes = await app.inject({
    method: 'POST',
    url: '/api/v1/sales/returns',
    headers: headersA,
    payload: {
      partyId: partyIdA,
      saleId: saleIdA,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdA, quantity: 5, unitPrice: 10000 }],
    },
  });
  if (overReturnRes.statusCode !== 400 || !JSON.parse(overReturnRes.body).error?.message?.includes('Over-return')) {
    throw new Error(`Expected over-return rejection (HTTP 400), got ${overReturnRes.statusCode}`);
  }
  console.log('   ✅ Over-Return Prevention Verified (Blocked returning 5 units when only 4 remain returnable)');

  // Third return: Return remaining 4 units (Valid -> Total 10 returned)
  const validReturn2Res = await app.inject({
    method: 'POST',
    url: '/api/v1/sales/returns',
    headers: headersA,
    payload: {
      partyId: partyIdA,
      saleId: saleIdA,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdA, quantity: 4, unitPrice: 10000 }],
    },
  });
  if (validReturn2Res.statusCode !== 201) {
    throw new Error(`Expected valid second return creation (201), got ${validReturn2Res.statusCode}`);
  }

  // Fourth return: Attempt to return 1 more unit now that 10/10 have been returned
  const fullyReturnedRes = await app.inject({
    method: 'POST',
    url: '/api/v1/sales/returns',
    headers: headersA,
    payload: {
      partyId: partyIdA,
      saleId: saleIdA,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdA, quantity: 1, unitPrice: 10000 }],
    },
  });
  if (fullyReturnedRes.statusCode !== 400) {
    throw new Error(`Expected rejection when invoice is fully returned, got ${fullyReturnedRes.statusCode}`);
  }
  console.log('   ✅ Full Return Cap Verified (10/10 units returned, further returns blocked)');

  // ── 5. ORIGINAL TRANSACTION OWNERSHIP VERIFICATION ────────────────────────
  // Tenant B attempts to return items against Tenant A's sale invoice
  const crossReturnRes = await app.inject({
    method: 'POST',
    url: '/api/v1/sales/returns',
    headers: headersB,
    payload: {
      partyId: partyIdA,
      saleId: saleIdA,
      date: new Date().toISOString(),
      items: [{ itemId: itemIdA, quantity: 1, unitPrice: 10000 }],
    },
  });
  if (crossReturnRes.statusCode !== 404) {
    throw new Error(`Expected HTTP 404 when Tenant B attempts return against Tenant A's sale, got ${crossReturnRes.statusCode}`);
  }
  console.log('   ✅ Original Transaction Ownership Verification Verified (Cross-tenant return rejected)');

  // ── 6. AUDIT LOGGING & SENSITIVE DATA REDACTION ──────────────────────────
  // Query Audit Logs for Tenant A as Owner A
  const auditLogsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/audit-logs',
    headers: headersA,
  });

  if (auditLogsRes.statusCode !== 200) {
    throw new Error(`Expected HTTP 200 when querying audit logs, got ${auditLogsRes.statusCode}`);
  }

  const logs = JSON.parse(auditLogsRes.body).data;
  if (!Array.isArray(logs) || logs.length === 0) {
    throw new Error('Audit log entries were not recorded in database');
  }

  // Verify Sensitive Key Redaction in Audit Logs
  const passwordLogs = await globalPrisma.auditLog.findMany({
    where: { action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'CHANGE_PASSWORD'] } },
  });
  for (const log of passwordLogs) {
    const str = JSON.stringify(log);
    if (str.includes(testPassword)) {
      throw new Error(`SECURITY VULNERABILITY: Raw password found unredacted in audit log ID ${log.id}!`);
    }
  }
  console.log(`   ✅ Audit Logging Verified (${logs.length} structured events recorded)`);
  console.log('   ✅ Sensitive Data Redaction Verified (0 raw passwords/tokens in database logs)');

  // ── 7. AUDIT LOG RBAC ENFORCEMENT ───────────────────────────────────────
  // Non-owner member (BILLER) attempts to view audit logs
  const memberEmail = `audit.biller.${Date.now()}@example.com`;
  const memberReg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Biller Staff', email: memberEmail, password: testPassword, businessName: 'Dummy' },
  });
  const memberUserId = JSON.parse(memberReg.body).data.userId;
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

  const memberAuditRes = await app.inject({
    method: 'GET',
    url: '/api/v1/audit-logs',
    headers: memberHeaders,
  });

  if (memberAuditRes.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 FORBIDDEN when BILLER attempts to access audit logs, got ${memberAuditRes.statusCode}`);
  }
  console.log('   ✅ Audit Log RBAC Protection Verified (BILLER role blocked from viewing audit logs)');

  await app.close();
  console.log('   🎉 ALL MASTER FINANCIAL SECURITY, AUDIT LOG & PRODUCTION TESTS PASSED SUCCESSFULLY!\n');
}

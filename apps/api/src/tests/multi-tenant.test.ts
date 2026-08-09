import { buildApp } from '../app.js';
import { globalPrisma } from '@bizmanage/database';

export async function runMultiTenantTests() {
  console.log('🧪 [TEST SUITE 2/4] Running Multi-Business Tenant Isolation Tests...');

  const app = buildApp();
  await app.ready();

  const emailA = `tenantA.${Date.now()}@example.com`;
  const emailB = `tenantB.${Date.now()}@example.com`;
  const password = 'Password123!';

  // 1. Create Business A
  const regA = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Owner A', email: emailA, password, businessName: 'Business A' },
  });
  const dataA = JSON.parse(regA.body).data;
  await globalPrisma.user.update({ where: { id: dataA.userId }, data: { isEmailVerified: true } });
  const loginA = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: emailA, password },
  });
  const loginDataA = JSON.parse(loginA.body).data;
  const tokenA = loginDataA.accessToken;
  const bizIdA = loginDataA.businesses[0].id;
  const headersA = { authorization: `Bearer ${tokenA}`, 'x-business-id': bizIdA };

  // 2. Create Business B
  const regB = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Owner B', email: emailB, password, businessName: 'Business B' },
  });
  const dataB = JSON.parse(regB.body).data;
  await globalPrisma.user.update({ where: { id: dataB.userId }, data: { isEmailVerified: true } });
  const loginB = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: emailB, password },
  });
  const loginDataB = JSON.parse(loginB.body).data;
  const tokenB = loginDataB.accessToken;
  const bizIdB = loginDataB.businesses[0].id;
  const headersB = { authorization: `Bearer ${tokenB}`, 'x-business-id': bizIdB };

  // 3. Create Private Party in Business B
  const partyBRes = await app.inject({
    method: 'POST',
    url: '/api/v1/parties',
    headers: headersB,
    payload: { name: 'Confidential Client B', type: 'CUSTOMER' },
  });
  const partyIdB = JSON.parse(partyBRes.body).data.id;

  // 4. Create Private Item in Business B
  const itemBRes = await app.inject({
    method: 'POST',
    url: '/api/v1/items',
    headers: headersB,
    payload: { name: 'Proprietary Hardware B', salePrice: 5000, purchasePrice: 3000 },
  });
  const itemIdB = JSON.parse(itemBRes.body).data.id;

  // 5. ASSERT Business A cannot fetch Business B's party list or specific party ID
  const listPartiesA = await app.inject({ method: 'GET', url: '/api/v1/parties', headers: headersA });
  const partiesA = JSON.parse(listPartiesA.body).data;
  if (partiesA.some((p: any) => p.id === partyIdB)) {
    throw new Error('TENANT ISOLATION FAILURE: Business A can see Business B parties in list!');
  }

  const getPartyA = await app.inject({ method: 'GET', url: `/api/v1/parties/${partyIdB}`, headers: headersA });
  if (getPartyA.statusCode === 200) {
    throw new Error('TENANT ISOLATION FAILURE: Business A fetched Business B party detail!');
  }
  console.log('   ✅ Party Directory Tenant Isolation Verified');

  // 6. ASSERT Business A cannot fetch Business B's item list or item detail
  const listItemsA = await app.inject({ method: 'GET', url: '/api/v1/items', headers: headersA });
  const itemsA = JSON.parse(listItemsA.body).data;
  if (itemsA.some((i: any) => i.id === itemIdB)) {
    throw new Error('TENANT ISOLATION FAILURE: Business A can see Business B items in list!');
  }

  const getItemA = await app.inject({ method: 'GET', url: `/api/v1/items/${itemIdB}`, headers: headersA });
  if (getItemA.statusCode === 200) {
    throw new Error('TENANT ISOLATION FAILURE: Business A fetched Business B item detail!');
  }
  console.log('   ✅ Inventory Masters Tenant Isolation Verified');

  // 7. ASSERT Header tampering attempt (Business A user sending Business B x-business-id header) is rejected with 403 Forbidden
  const spoofHeaderRes = await app.inject({
    method: 'GET',
    url: '/api/v1/parties',
    headers: { authorization: `Bearer ${tokenA}`, 'x-business-id': bizIdB },
  });

  if (spoofHeaderRes.statusCode !== 403) {
    throw new Error('TENANT SECURITY FAILURE: Unauthorized x-business-id header spoofing was not blocked!');
  }
  console.log('   ✅ Unauthorized Business Tenant Header Spoofing Blocked (HTTP 403)');

  await app.close();
}

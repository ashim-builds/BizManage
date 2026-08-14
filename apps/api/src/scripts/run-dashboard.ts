import { buildApp } from '../app.js';

async function testRoute() {
  const app = buildApp();
  await app.ready();
  
  // 1. Get a valid token for business c1b181db-ff3a-4ef4-bef0-112dfd666d6a
  const token = app.jwt.sign({
    userId: '809d3b10-6bf7-46dc-a077-d6b79c3f59fa', // Just any string, but auth middleware checks DB? 
    email: 'info.ashimworkz@gmail.com',
  });

  // But auth middleware `requireBusinessTenant` might verify the user from DB.
  // Let's query the DB for the first user.
  const { globalPrisma } = await import('@bizmanage/database');
  const user = await globalPrisma.user.findFirst({
    include: { memberships: true }
  });
  
  if (!user || user.memberships.length === 0) {
    console.log('No user or memberships found');
    process.exit(1);
  }

  const userToken = app.jwt.sign({
    userId: user.id,
    email: user.email,
  });

  const businessId = user.memberships[0].businessId;

  console.log(`Testing dashboard metrics for business ${businessId}...`);

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/dashboard/metrics',
    headers: {
      'X-Business-Id': businessId,
    },
    cookies: {
      accessToken: userToken,
    }
  });

  console.log('Status Code:', response.statusCode);
  console.log('Body:', response.body);
  process.exit(0);
}

testRoute().catch(console.error);

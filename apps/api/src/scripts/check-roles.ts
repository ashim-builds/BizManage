import { PrismaClient } from '@bizmanage/database';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  const roles = await prisma.userBusinessRole.findMany();
  const businesses = await prisma.business.findMany();
  
  console.log('Users:', users.map(u => ({ id: u.id, activeBusinessId: u.activeBusinessId })));
  console.log('Roles:', roles);
  console.log('Businesses:', businesses.map(b => b.id));
}

check().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@bizmanage/database';

const prisma = new PrismaClient();

async function fix() {
  const users = await prisma.user.findMany();
  const business = await prisma.business.findFirst();
  
  if (!business) {
    console.error('No business found');
    return;
  }

  for (const user of users) {
    // Give everyone access to the single test business
    await prisma.userBusinessRole.upsert({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: business.id
        }
      },
      update: { role: 'ADMIN' },
      create: {
        userId: user.id,
        businessId: business.id,
        role: 'ADMIN'
      }
    });

    // Set everyone's active business to the test business
    await prisma.user.update({
      where: { id: user.id },
      data: { activeBusinessId: business.id }
    });
  }

  console.log('Fixed orphaned users and gave everyone access to the test business.');
}

fix().catch(console.error).finally(() => prisma.$disconnect());

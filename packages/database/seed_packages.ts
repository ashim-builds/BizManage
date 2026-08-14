import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding packages...');

  await prisma.subscriptionPackage.deleteMany({});

  const basic = await prisma.subscriptionPackage.create({
    data: {
      name: 'Free Trial',
      price: 0,
      trialDays: 14,
      features: JSON.stringify(['Basic Invoicing', 'Customer Management']),
      isActive: true,
      isDefault: true,
      displayOrder: 1,
    }
  });

  const pro = await prisma.subscriptionPackage.create({
    data: {
      name: 'Starter',
      price: 999,
      trialDays: 0,
      features: JSON.stringify(['Advanced Invoicing', 'Inventory Tracking']),
      isActive: true,
      isDefault: false,
      displayOrder: 2,
    }
  });

  const premium = await prisma.subscriptionPackage.create({
    data: {
      name: 'Premium',
      price: 2499,
      trialDays: 0,
      features: JSON.stringify([
        'Unlimited Everything',
        'Priority Support',
        'MULTI_BRANCH',
        'STAFF_ROLES',
        'ACCOUNT_MANAGER'
      ]),
      isActive: true,
      isDefault: false,
      displayOrder: 3,
    }
  });

  console.log('Packages seeded!', { basic, pro, premium });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

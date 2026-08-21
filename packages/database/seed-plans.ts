import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Subscription Packages...');

  const plans = [
    {
      name: 'Free Forever',
      price: 0.00,
      currency: 'USD',
      billingPeriod: 'MONTHLY',
      trialDays: 0,
      features: JSON.stringify(['INVENTORY_TRACKING', 'BASIC_REPORTING', 'MAX_MEMBERS_1']),
      isActive: true,
      isDefault: true,
      displayOrder: 1,
    },
    {
      name: 'Starter Monthly',
      price: 19.99,
      currency: 'USD',
      billingPeriod: 'MONTHLY',
      trialDays: 14,
      features: JSON.stringify(['INVENTORY_TRACKING', 'ADVANCED_REPORTING', 'MAX_MEMBERS_5', 'API_ACCESS']),
      isActive: true,
      isDefault: false,
      displayOrder: 2,
    },
    {
      name: 'Pro Monthly',
      price: 49.99,
      currency: 'USD',
      billingPeriod: 'MONTHLY',
      trialDays: 14,
      features: JSON.stringify(['INVENTORY_TRACKING', 'ADVANCED_REPORTING', 'UNLIMITED_MEMBERS', 'API_ACCESS', 'CUSTOM_BRANDING']),
      isActive: true,
      isDefault: false,
      displayOrder: 3,
    },
    {
      name: 'Enterprise Yearly',
      price: 499.99,
      currency: 'USD',
      billingPeriod: 'YEARLY',
      trialDays: 30,
      features: JSON.stringify(['INVENTORY_TRACKING', 'ADVANCED_REPORTING', 'UNLIMITED_MEMBERS', 'API_ACCESS', 'CUSTOM_BRANDING', 'DEDICATED_SUPPORT']),
      isActive: true,
      isDefault: false,
      displayOrder: 4,
    }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPackage.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`Upserted plan: ${plan.name}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

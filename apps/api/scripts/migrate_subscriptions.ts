import { globalPrisma } from '@bizmanage/database';

async function migrateSubscriptions() {
  console.log('Migrating existing businesses to Subscription model...');
  
  const businesses = await globalPrisma.business.findMany({
    where: {
      subscriptionPackageId: { not: null }
    }
  });

  console.log(`Found ${businesses.length} businesses with a subscription package.`);

  let migratedCount = 0;

  for (const business of businesses) {
    if (!business.subscriptionPackageId) continue;

    const existingSub = await globalPrisma.subscription.findFirst({
      where: { businessId: business.id }
    });

    if (existingSub) {
      console.log(`Business ${business.id} already has a subscription. Skipping.`);
      continue;
    }

    const startDate = business.createdAt;
    const endDate = business.currentPeriodEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 10)); // Default far future if null

    await globalPrisma.subscription.create({
      data: {
        businessId: business.id,
        subscriptionPackageId: business.subscriptionPackageId,
        status: business.subscriptionStatus || 'ACTIVE',
        startDate,
        endDate
      }
    });

    migratedCount++;
  }

  console.log(`Successfully migrated ${migratedCount} businesses.`);
}

migrateSubscriptions()
  .catch(console.error)
  .finally(async () => {
    await globalPrisma.$disconnect();
    process.exit(0);
  });

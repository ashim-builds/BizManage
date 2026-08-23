import { globalPrisma } from '@bizmanage/database';

export async function seedDefaultPackages() {
  try {
    const canonicalPlans = [
      {
        name: 'Free Starter',
        price: 0,
        currency: 'NPR',
        billingPeriod: 'MONTHLY' as const,
        trialDays: 0,
        features: JSON.stringify(['COMPLETE_ACCOUNTING', 'INVENTORY_TRACKING', 'AUTO_LEDGER', 'E2E_ENCRYPTION']),
        isActive: true,
        isDefault: true,
        displayOrder: 1,
      },
      {
        name: 'Standard Monthly',
        price: 999,
        currency: 'NPR',
        billingPeriod: 'MONTHLY' as const,
        trialDays: 14,
        features: JSON.stringify([
          'COMPLETE_ACCOUNTING',
          'INVENTORY_TRACKING',
          'AUTO_LEDGER',
          'WALLET_SYNC',
          'E2E_ENCRYPTION',
          'MULTI_USER_ROLES',
          'ADVANCED_REPORTS',
          'CUSTOM_BRANDING',
        ]),
        isActive: true,
        isDefault: false,
        displayOrder: 2,
      },
      {
        name: 'Premium Monthly',
        price: 1199,
        currency: 'NPR',
        billingPeriod: 'MONTHLY' as const,
        trialDays: 14,
        features: JSON.stringify([
          'COMPLETE_ACCOUNTING',
          'INVENTORY_TRACKING',
          'AUTO_LEDGER',
          'WALLET_SYNC',
          'E2E_ENCRYPTION',
          'MULTI_USER_ROLES',
          'ADVANCED_REPORTS',
          'CUSTOM_BRANDING',
          'POS_BILLING',
          'BARCODE_PRINTING',
          'PRIORITY_SUPPORT',
        ]),
        isActive: true,
        isDefault: false,
        displayOrder: 3,
      },
      {
        name: 'Premium Yearly',
        price: 11990,
        currency: 'NPR',
        billingPeriod: 'YEARLY' as const,
        trialDays: 30,
        features: JSON.stringify([
          'COMPLETE_ACCOUNTING',
          'INVENTORY_TRACKING',
          'AUTO_LEDGER',
          'WALLET_SYNC',
          'E2E_ENCRYPTION',
          'MULTI_USER_ROLES',
          'ADVANCED_REPORTS',
          'CUSTOM_BRANDING',
          'POS_BILLING',
          'BARCODE_PRINTING',
          'PRIORITY_SUPPORT',
        ]),
        isActive: true,
        isDefault: false,
        displayOrder: 4,
      },
      {
        name: 'Developer Testing Plan (Localhost)',
        price: 0,
        currency: 'NPR',
        billingPeriod: 'MONTHLY' as const,
        trialDays: 365,
        features: JSON.stringify([
          'COMPLETE_ACCOUNTING',
          'INVENTORY_TRACKING',
          'AUTO_LEDGER',
          'WALLET_SYNC',
          'E2E_ENCRYPTION',
          'MULTI_USER_ROLES',
          'ADVANCED_REPORTS',
          'CUSTOM_BRANDING',
          'POS_BILLING',
          'BARCODE_PRINTING',
          'PRIORITY_SUPPORT',
        ]),
        isActive: true,
        isDefault: false,
        displayOrder: 5,
      },
    ];

    const seededPackageIds: string[] = [];
    let freeStarterId = '';

    for (const plan of canonicalPlans) {
      const existing = await globalPrisma.subscriptionPackage.findUnique({
        where: { name: plan.name },
      });

      if (existing) {
        const updated = await globalPrisma.subscriptionPackage.update({
          where: { id: existing.id },
          data: plan,
        });
        seededPackageIds.push(updated.id);
        if (plan.isDefault) freeStarterId = updated.id;
      } else {
        const created = await globalPrisma.subscriptionPackage.create({
          data: plan,
        });
        seededPackageIds.push(created.id);
        if (plan.isDefault) freeStarterId = created.id;
      }
    }

    // Clean up legacy old packages
    const legacyPackages = await globalPrisma.subscriptionPackage.findMany({
      where: {
        id: { notIn: seededPackageIds },
      },
    });

    if (legacyPackages.length > 0) {
      const legacyIds = legacyPackages.map((p) => p.id);

      if (freeStarterId) {
        await globalPrisma.business.updateMany({
          where: { subscriptionPackageId: { in: legacyIds } },
          data: { subscriptionPackageId: freeStarterId },
        });

        await globalPrisma.subscription.updateMany({
          where: { subscriptionPackageId: { in: legacyIds } },
          data: { subscriptionPackageId: freeStarterId },
        });

        await globalPrisma.subscriptionPayment.updateMany({
          where: { subscriptionPackageId: { in: legacyIds } },
          data: { subscriptionPackageId: freeStarterId },
        });
      }

      await globalPrisma.subscriptionPackage.deleteMany({
        where: { id: { in: legacyIds } },
      });

      console.log(`🧹 Removed ${legacyPackages.length} legacy subscription packages.`);
    }

    console.log('🌱 Synchronized default subscription packages (Free Starter, Standard Monthly, Premium Monthly & Premium Yearly).');
  } catch (error) {
    console.error('Failed to sync default packages:', error);
  }
}

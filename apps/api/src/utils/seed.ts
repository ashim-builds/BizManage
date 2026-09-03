import { globalPrisma } from '@bizmanage/database';

export async function seedDefaultPackages() {
  const officialPackages = [
    {
      name: 'Free Starter',
      price: 0,
      currency: 'NPR',
      billingPeriod: 'MONTHLY',
      trialDays: 0,
      features: [
        'COMPLETE_ACCOUNTING',
        'INVENTORY_TRACKING',
        'AUTO_LEDGER',
        'WALLET_SYNC',
        'E2E_ENCRYPTION',
      ],
      isActive: true,
      isDefault: true,
      displayOrder: 1,
    },
    {
      name: 'Gold Edition',
      price: 2499,
      currency: 'NPR',
      billingPeriod: 'YEARLY',
      trialDays: 14,
      features: [
        'COMPLETE_ACCOUNTING',
        'INVENTORY_TRACKING',
        'AUTO_LEDGER',
        'WALLET_SYNC',
        'E2E_ENCRYPTION',
        'POS_BILLING',
        'BARCODE_PRINTING',
        'WHATSAPP_MARKETING',
        'CUSTOM_BRANDING',
        'CUSTOM_LOGO',
        'ADVANCED_REPORTS',
        'MULTI_USER_ROLES',
      ],
      isActive: true,
      isDefault: false,
      displayOrder: 2,
    },
    {
      name: 'Platinum ERP',
      price: 3999,
      currency: 'NPR',
      billingPeriod: 'YEARLY',
      trialDays: 14,
      features: [
        'COMPLETE_ACCOUNTING',
        'INVENTORY_TRACKING',
        'AUTO_LEDGER',
        'WALLET_SYNC',
        'E2E_ENCRYPTION',
        'POS_BILLING',
        'BARCODE_PRINTING',
        'WHATSAPP_MARKETING',
        'CUSTOM_BRANDING',
        'CUSTOM_LOGO',
        'ADVANCED_REPORTS',
        'MULTI_USER_ROLES',
        'GODOWN_MANAGEMENT',
        'MANUFACTURING',
        'ONLINE_STOREFRONT',
        'TALLY_EXPORT',
        'PREMIUM_REPORTS',
        'STAFF_PAYROLL',
        'PRIORITY_SUPPORT',
      ],
      isActive: true,
      isDefault: false,
      displayOrder: 3,
    },
  ];

  for (const pkg of officialPackages) {
    const existing = await globalPrisma.subscriptionPackage.findFirst({
      where: { name: pkg.name },
    });
    if (existing) {
      await globalPrisma.subscriptionPackage.update({
        where: { id: existing.id },
        data: {
          ...pkg,
          features: pkg.features as any,
        },
      });
    } else {
      await globalPrisma.subscriptionPackage.create({
        data: {
          ...pkg,
          features: pkg.features as any,
        },
      });
    }
  }

  // Cleanup legacy names
  const freePkg = await globalPrisma.subscriptionPackage.findUnique({ where: { name: 'Free Starter' } });
  const goldPkg = await globalPrisma.subscriptionPackage.findUnique({ where: { name: 'Gold Edition' } });
  const legacyNames = ['Standard Monthly', 'Premium Monthly', 'Premium Yearly', 'Free Forever', 'Starter Monthly', 'Pro Monthly', 'Enterprise Yearly'];

  for (const name of legacyNames) {
    const legacyPkg = await globalPrisma.subscriptionPackage.findUnique({ where: { name } });
    if (legacyPkg && freePkg && goldPkg) {
      const targetId = Number(legacyPkg.price) === 0 ? freePkg.id : goldPkg.id;
      await globalPrisma.business.updateMany({ where: { subscriptionPackageId: legacyPkg.id }, data: { subscriptionPackageId: targetId } });
      await globalPrisma.subscription.updateMany({ where: { subscriptionPackageId: legacyPkg.id }, data: { subscriptionPackageId: targetId } });
      await globalPrisma.subscriptionPayment.updateMany({ where: { subscriptionPackageId: legacyPkg.id }, data: { subscriptionPackageId: targetId } });
      await globalPrisma.subscriptionPackage.delete({ where: { id: legacyPkg.id } });
    }
  }
}


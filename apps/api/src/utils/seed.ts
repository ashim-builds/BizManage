import { globalPrisma } from '@bizmanage/database';

export async function seedDefaultPackages() {
  try {
    const packagesCount = await globalPrisma.subscriptionPackage.count();

    if (packagesCount === 0) {
      await globalPrisma.subscriptionPackage.createMany({
        data: [
          {
            name: 'Free Starter',
            price: 0,
            currency: 'NPR',
            billingPeriod: 'MONTHLY',
            trialDays: 0,
            features: JSON.stringify(['COMPLETE_ACCOUNTING', 'INVENTORY_TRACKING', 'AUTO_LEDGER']),
            isActive: true,
            isDefault: true,
            displayOrder: 1,
          },
          {
            name: 'Standard Monthly',
            price: 999,
            currency: 'NPR',
            billingPeriod: 'MONTHLY',
            trialDays: 14,
            features: JSON.stringify([
              'COMPLETE_ACCOUNTING',
              'INVENTORY_TRACKING',
              'AUTO_LEDGER',
              'WALLET_SYNC',
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
            billingPeriod: 'MONTHLY',
            trialDays: 14,
            features: JSON.stringify([
              'COMPLETE_ACCOUNTING',
              'INVENTORY_TRACKING',
              'AUTO_LEDGER',
              'WALLET_SYNC',
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
            billingPeriod: 'YEARLY',
            trialDays: 30,
            features: JSON.stringify([
              'COMPLETE_ACCOUNTING',
              'INVENTORY_TRACKING',
              'AUTO_LEDGER',
              'WALLET_SYNC',
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
        ],
      });
      console.log('🌱 Seeded default subscription package tiers (Free, Standard, Premium Monthly & Premium Yearly).');
    }
  } catch (error) {
    console.error('Failed to seed default packages:', error);
  }
}

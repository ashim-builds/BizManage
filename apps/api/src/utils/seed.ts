import { globalPrisma } from '@bizmanage/database';

export async function seedDefaultPackages() {
  try {
    const defaultPackage = await globalPrisma.subscriptionPackage.findFirst({
      where: { isDefault: true }
    });

    if (!defaultPackage) {
      await globalPrisma.subscriptionPackage.create({
        data: {
          name: 'Free Starter',
          price: 0,
          currency: 'NPR',
          billingPeriod: 'MONTHLY',
          trialDays: 0,
          features: JSON.stringify(['UNLIMITED_INVOICES', 'INVENTORY_TRACKING', 'AUTO_LEDGER', 'CASH_BANK']),
          isActive: true,
          isDefault: true,
          displayOrder: 1
        }
      });
      console.log('🌱 Seeded default Free Starter subscription package.');
    }
  } catch (error) {
    console.error('Failed to seed default packages:', error);
  }
}

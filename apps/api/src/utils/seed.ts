import { globalPrisma } from '@bizmanage/database';

export async function seedDefaultPackages() {
  const defaultPackages = [
    {
      name: 'Free Starter',
      price: 0,
      currency: 'NPR',
      billingPeriod: 'MONTHLY',
      trialDays: 0,
      features: ['Basic Billing & Invoicing', 'Inventory Tracking', 'Up to 50 Products', 'Single User Access'],
      isActive: true,
      displayOrder: 1,
    },
    {
      name: 'Premium Plan',
      price: 1199,
      currency: 'NPR',
      billingPeriod: 'MONTHLY',
      trialDays: 14,
      features: [
        'Unlimited Products & Billing',
        'Thermal Receipt & VAT Invoice Printing',
        'POS Multi-Word Tokenized Search',
        'Customer Aging & Financial Reports',
        'E2EE End-to-End Encrypted Backups',
        'Multi-User Staff Roles & Audit Logs',
      ],
      isActive: true,
      displayOrder: 2,
    },
    {
      name: 'Enterprise Plan',
      price: 2499,
      currency: 'NPR',
      billingPeriod: 'MONTHLY',
      trialDays: 30,
      features: [
        'All Premium Features',
        'Dedicated Priority Support',
        'Custom Data Export & API Access',
        'Unlimited Outlets & Warehouses',
      ],
      isActive: true,
      displayOrder: 3,
    },
  ];

  for (const pkg of defaultPackages) {
    const existing = await globalPrisma.subscriptionPackage.findFirst({
      where: { name: pkg.name },
    });
    if (!existing) {
      await globalPrisma.subscriptionPackage.create({
        data: {
          ...pkg,
          features: pkg.features as any,
        },
      });
    }
  }
}

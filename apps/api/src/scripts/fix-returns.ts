import { globalPrisma as prisma } from '@bizmanage/database';

async function main() {
  console.log('Fixing historical returned invoices...');

  // Find all SaleReturns
  const saleReturns = await prisma.saleReturn.findMany();
  for (const sr of saleReturns) {
    if (sr.saleId) {
      console.log(`Updating Sale ${sr.saleId} to RETURNED...`);
      await prisma.sale.update({
        where: { id: sr.saleId },
        data: { status: 'RETURNED' as any }, // Using 'as any' in case Prisma Client is not regenerated yet
      });
    }
  }

  // Find all PurchaseReturns
  const purchaseReturns = await prisma.purchaseReturn.findMany();
  for (const pr of purchaseReturns) {
    if (pr.purchaseId) {
      console.log(`Updating Purchase ${pr.purchaseId} to RETURNED...`);
      await prisma.purchase.update({
        where: { id: pr.purchaseId },
        data: { status: 'RETURNED' as any },
      });
    }
  }

  console.log('Done fixing historical returns.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

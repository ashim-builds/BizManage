import { PrismaClient } from '@bizmanage/database';

const prisma = new PrismaClient();

async function test() {
  const businessId = (await prisma.business.findFirst())?.id;
  if (!businessId) throw new Error('No business');

  console.log('Testing dashboard aggregations...');
  try {
    const saleReturnAgg = await prisma.saleReturn.aggregate({
      where: { businessId },
      _sum: { totalAmount: true },
    });
    console.log('SaleReturn:', saleReturnAgg);
  } catch (e) {
    console.error('SaleReturn error:', e);
  }

  try {
    const purchaseReturnAgg = await prisma.purchaseReturn.aggregate({
      where: { businessId },
      _sum: { totalAmount: true },
    });
    console.log('PurchaseReturn:', purchaseReturnAgg);
  } catch (e) {
    console.error('PurchaseReturn error:', e);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());

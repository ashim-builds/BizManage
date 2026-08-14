import { PrismaClient } from '@bizmanage/database';

const prisma = new PrismaClient();

async function test() {
  const business = await prisma.business.findFirst();
  if (!business) throw new Error('No business');
  const businessId = business.id;

  console.log('Testing ALL dashboard aggregations...');
  try {
    const [
      partyAgg,
      accounts,
      salesAgg,
      purchasesAgg,
      expensesAgg,
      recentTransactions,
      lowStockItems,
      totalItems,
      totalProducts,
      totalParties,
      saleReturnAgg,
      purchaseReturnAgg,
    ] = await Promise.all([
      prisma.party.aggregate({
        where: { businessId },
        _sum: { currentBalance: true },
      }),
      prisma.account.findMany({
        where: { businessId },
        select: { accountType: true, balance: true, accountName: true },
      }),
      prisma.sale.aggregate({
        where: { businessId },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.purchase.aggregate({
        where: { businessId },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: { businessId },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { businessId },
        include: { account: { select: { accountName: true } } },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.item.findMany({
        where: { businessId, type: 'PRODUCT' },
        select: { id: true, name: true, code: true, currentStock: true, minStockAlert: true, unit: true },
        orderBy: { currentStock: 'asc' },
        take: 20,
      }),
      prisma.item.count({ where: { businessId } }),
      prisma.item.count({ where: { businessId, type: 'PRODUCT' } }),
      prisma.party.count({ where: { businessId } }),
      prisma.saleReturn.aggregate({
        where: { businessId },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseReturn.aggregate({
        where: { businessId },
        _sum: { totalAmount: true },
      }),
    ]);
    
    console.log('All DB queries successful.');
  } catch (e) {
    console.error('Error during DB queries:', e);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());

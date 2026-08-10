import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { AccountType, Prisma } from '@bizmanage/database';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // Single-endpoint executive dashboard metrics
  fastify.get('/metrics', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const hasDateFilter = !!(startDate || endDate);

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
    ] = await Promise.all([
      // 1. To Receive / To Give — two fast aggregate queries instead of fetching all rows
      request.db!.party.aggregate({
        where: { businessId },
        _sum: { currentBalance: true },
      }),

      // 2. Cash & Bank Accounts — small table, fine as findMany
      request.db!.account.findMany({
        where: { businessId },
        select: { accountType: true, balance: true, accountName: true },
      }),

      // 3. Sales total — aggregate SUM at DB level
      request.db!.sale.aggregate({
        where: {
          businessId,
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // 4. Purchases total — aggregate SUM at DB level
      request.db!.purchase.aggregate({
        where: {
          businessId,
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // 5. Expenses total — aggregate SUM at DB level
      request.db!.expense.aggregate({
        where: {
          businessId,
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),

      // 6. Recent 10 Transactions — already limited
      request.db!.transaction.findMany({
        where: { businessId },
        include: {
          account: { select: { accountName: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),

      // 7. Low-Stock Items
      request.db!.item.findMany({
        where: {
          businessId,
          type: 'PRODUCT',
        },
        select: { id: true, name: true, code: true, currentStock: true, minStockAlert: true, unit: true },
        orderBy: { currentStock: 'asc' },
        take: 20,
      }),

      // 8. Total Items, Products & Parties count
      request.db!.item.count({ where: { businessId } }),
      request.db!.item.count({ where: { businessId, type: 'PRODUCT' } }),
      request.db!.party.count({ where: { businessId } }),
    ]);

    // Calculate To Receive & To Give from party aggregate
    // Since Prisma aggregate returns the net sum, we do two targeted queries
    const [toReceiveAgg, toGiveAgg] = await Promise.all([
      request.db!.party.aggregate({
        where: { businessId, currentBalance: { gt: 0 } },
        _sum: { currentBalance: true },
      }),
      request.db!.party.aggregate({
        where: { businessId, currentBalance: { lt: 0 } },
        _sum: { currentBalance: true },
      }),
    ]);

    // Calculate Cash & Bank from account balances
    let totalCash = new Prisma.Decimal(0);
    let totalBank = new Prisma.Decimal(0);
    for (const a of accounts) {
      const bal = new Prisma.Decimal(a.balance || 0);
      if (a.accountType === AccountType.CASH) {
        totalCash = totalCash.add(bal);
      } else {
        totalBank = totalBank.add(bal);
      }
    }

    // Filter low-stock items in application (already limited to 20 items)
    const lowStockAlerts = lowStockItems.filter((i) =>
      Number(i.minStockAlert) > 0 && Number(i.currentStock) <= Number(i.minStockAlert)
    );

    const toReceive = Number(toReceiveAgg._sum.currentBalance || 0);
    const toGiveRaw = Number(toGiveAgg._sum.currentBalance || 0);
    const toGive = toGiveRaw < 0 ? Math.abs(toGiveRaw) : toGiveRaw;

    return reply.send({
      success: true,
      data: {
        toReceive,
        toGive,
        totalSales: Number(salesAgg._sum.totalAmount || 0),
        totalPurchases: Number(purchasesAgg._sum.totalAmount || 0),
        totalExpenses: Number(expensesAgg._sum.amount || 0),
        totalCash: totalCash.toNumber(),
        totalBank: totalBank.toNumber(),
        totalCashAndBank: totalCash.add(totalBank).toNumber(),
        recentTransactions,
        lowStockItems: lowStockAlerts,
        salesCount: salesAgg._count.id,
        purchasesCount: purchasesAgg._count.id,
        totalItemsCount: totalItems,
        totalProductsCount: totalProducts,
        totalPartiesCount: totalParties,
      },
    });
  });
}

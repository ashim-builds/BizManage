import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { AccountType, InvoiceStatus, Prisma } from '@bizmanage/database';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // Single-endpoint executive dashboard metrics
  fastify.get('/metrics', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    // Robust date filter handling (start of day to end of day)
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      dateFilter.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateFilter.lte = e;
    }
    const hasDateFilter = !!(startDate || endDate);

    // Today's date filter for independent Today's Sales Margin summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayDateFilter: Prisma.DateTimeFilter = {
      gte: todayStart,
      lte: todayEnd,
    };

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
      salesForMargin,
      todaySalesAgg,
      todaySaleReturnAgg,
      todayPurchasesAgg,
      todayExpensesAgg,
      todaySalesForMargin,
    ] = await Promise.all([
      // 1. To Receive / To Give
      request.db!.party.aggregate({
        where: { businessId },
        _sum: { currentBalance: true },
      }),

      // 2. Cash & Bank Accounts
      request.db!.account.findMany({
        where: { businessId },
        select: { accountType: true, balance: true, accountName: true },
      }),

      // 3. Sales total in filtered period
      request.db!.sale.aggregate({
        where: {
          businessId,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // 4. Purchases total in filtered period
      request.db!.purchase.aggregate({
        where: {
          businessId,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // 5. Expenses total in filtered period
      request.db!.expense.aggregate({
        where: {
          businessId,
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),

      // 6. Recent 10 Transactions
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

      // 9. Sales Return total in filtered period
      request.db!.saleReturn.aggregate({
        where: {
          businessId,
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
      }),

      // 10. Purchases Return total in filtered period
      request.db!.purchaseReturn.aggregate({
        where: {
          businessId,
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
      }),

      // 11. Sales items in filtered period for Cost of Goods Sold (COGS) & Sales Margin
      request.db!.sale.findMany({
        where: {
          businessId,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(hasDateFilter ? { date: dateFilter } : {}),
        },
        select: {
          items: {
            select: {
              quantity: true,
              returnedQuantity: true,
              item: {
                select: {
                  purchasePrice: true,
                },
              },
            },
          },
        },
      }),

      // 12. Today's Sales aggregate
      request.db!.sale.aggregate({
        where: { businessId, status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] }, date: todayDateFilter },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // 13. Today's Sale Returns aggregate
      request.db!.saleReturn.aggregate({
        where: { businessId, date: todayDateFilter },
        _sum: { totalAmount: true },
      }),

      // 14. Today's Purchases aggregate
      request.db!.purchase.aggregate({
        where: { businessId, status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] }, date: todayDateFilter },
        _sum: { totalAmount: true },
      }),

      // 15. Today's Expenses aggregate
      request.db!.expense.aggregate({
        where: { businessId, date: todayDateFilter },
        _sum: { amount: true },
      }),

      // 16. Today's Sales with items for Today's COGS & Sales Margin
      request.db!.sale.findMany({
        where: { businessId, status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] }, date: todayDateFilter },
        select: {
          items: {
            select: {
              quantity: true,
              returnedQuantity: true,
              item: {
                select: {
                  purchasePrice: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Calculate To Receive & To Give from party aggregate
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

    // Filter low-stock items in application
    const lowStockAlerts = lowStockItems.filter((i) =>
      Number(i.minStockAlert) > 0 && Number(i.currentStock) <= Number(i.minStockAlert)
    );

    const toReceive = Number(toReceiveAgg._sum.currentBalance || 0);
    const toGiveRaw = Number(toGiveAgg._sum.currentBalance || 0);
    const toGive = toGiveRaw < 0 ? Math.abs(toGiveRaw) : toGiveRaw;

    // Filtered Period Calculations
    const grossSales = Number(salesAgg._sum.totalAmount || 0);
    const saleReturns = Number(saleReturnAgg._sum.totalAmount || 0);
    const netSales = Math.max(0, grossSales - saleReturns);

    const grossPurchases = Number(purchasesAgg._sum.totalAmount || 0);
    const purchaseReturns = Number(purchaseReturnAgg._sum.totalAmount || 0);
    const netPurchases = Math.max(0, grossPurchases - purchaseReturns);

    // Calculate Period COGS (Cost of Goods Sold)
    let cogs = 0;
    for (const s of salesForMargin) {
      for (const it of s.items) {
        const qty = Math.max(0, Number(it.quantity || 0) - Number(it.returnedQuantity || 0));
        const cost = Number(it.item?.purchasePrice || 0);
        cogs += qty * cost;
      }
    }

    // Period Sales Margin (Gross Profit on Sales)
    const salesMargin = netSales - cogs;
    const salesMarginPercentage = netSales > 0 ? (salesMargin / netSales) * 100 : 0;

    // Period Operating Expenses & Net Profit
    const totalExpenses = Number(expensesAgg._sum.amount || 0);
    const netProfit = salesMargin - totalExpenses;
    const netProfitPercentage = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    // Independent Today's Calculations
    const todayGrossSales = Number(todaySalesAgg._sum.totalAmount || 0);
    const todaySaleReturns = Number(todaySaleReturnAgg._sum.totalAmount || 0);
    const todayNetSales = Math.max(0, todayGrossSales - todaySaleReturns);

    let todayCogs = 0;
    for (const s of todaySalesForMargin) {
      for (const it of s.items) {
        const qty = Math.max(0, Number(it.quantity || 0) - Number(it.returnedQuantity || 0));
        const cost = Number(it.item?.purchasePrice || 0);
        todayCogs += qty * cost;
      }
    }

    const todaySalesMargin = todayNetSales - todayCogs;
    const todaySalesMarginPercentage = todayNetSales > 0 ? (todaySalesMargin / todayNetSales) * 100 : 0;
    const todayTotalPurchases = Number(todayPurchasesAgg._sum.totalAmount || 0);
    const todayTotalExpenses = Number(todayExpensesAgg._sum.amount || 0);
    const todayNetProfit = todaySalesMargin - todayTotalExpenses;

    return reply.send({
      success: true,
      data: {
        toReceive,
        toGive,
        totalSales: netSales,
        grossSales,
        saleReturns,
        totalPurchases: netPurchases,
        grossPurchases,
        purchaseReturns,
        totalExpenses,
        cogs,
        salesMargin,
        salesMarginPercentage,
        netProfit,
        netProfitPercentage,
        todaySummary: {
          sales: todayNetSales,
          grossSales: todayGrossSales,
          saleReturns: todaySaleReturns,
          cogs: todayCogs,
          salesMargin: todaySalesMargin,
          salesMarginPercentage: todaySalesMarginPercentage,
          purchases: todayTotalPurchases,
          expenses: todayTotalExpenses,
          netProfit: todayNetProfit,
          salesCount: todaySalesAgg._count.id,
        },
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

import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { Prisma } from '@bizmanage/database';

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // 1. SALES REPORT API
  // 1. SALES REPORT API
  // ----------------------------------------------------
  fastify.get('/sales', async (request, reply) => {
    const { startDate, endDate, partyId, search, page = '1', limit = '200' } = request.query as {
      startDate?: string;
      endDate?: string;
      partyId?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.SaleWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }
    if (partyId) whereClause.partyId = partyId;
    if (search?.trim()) {
      whereClause.OR = [
        { invoiceNumber: { contains: search.trim(), mode: 'insensitive' } },
        { party: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    // Run aggregate (summary totals) and paginated rows in parallel
    const [agg, rows, totalCount] = await Promise.all([
      request.db!.sale.aggregate({
        where: whereClause,
        _sum: { totalAmount: true, taxAmount: true, discount: true, paidAmount: true, dueAmount: true },
        _count: { id: true },
      }),
      request.db!.sale.findMany({
        where: whereClause,
        include: { party: { select: { id: true, name: true, phone: true, taxNumber: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      request.db!.sale.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: {
        summary: {
          invoicesCount: agg._count.id,
          totalRevenue: Number(agg._sum.totalAmount || 0),
          totalTax: Number(agg._sum.taxAmount || 0),
          totalDiscount: Number(agg._sum.discount || 0),
          totalPaid: Number(agg._sum.paidAmount || 0),
          totalDue: Number(agg._sum.dueAmount || 0),
        },
        rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  });



  // ----------------------------------------------------
  // 2. PURCHASE REPORT API
  // ----------------------------------------------------
  fastify.get('/purchases', async (request, reply) => {
    const { startDate, endDate, partyId, search } = request.query as {
      startDate?: string;
      endDate?: string;
      partyId?: string;
      search?: string;
    };

    const whereClause: Prisma.PurchaseWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    if (partyId) {
      whereClause.partyId = partyId;
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { billNumber: { contains: search.trim(), mode: 'insensitive' } },
        { party: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const purchases = await request.db!.purchase.findMany({
      where: whereClause,
      include: {
        party: { select: { id: true, name: true, phone: true, taxNumber: true } },
      },
      orderBy: { date: 'desc' },
    });

    let totalSpend = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);
    let totalDiscount = new Prisma.Decimal(0);
    let totalPaid = new Prisma.Decimal(0);
    let totalDue = new Prisma.Decimal(0);

    for (const p of purchases) {
      totalSpend = totalSpend.add(p.totalAmount || 0);
      totalTax = totalTax.add(p.taxAmount || 0);
      totalDiscount = totalDiscount.add(p.discount || 0);
      totalPaid = totalPaid.add(p.paidAmount || 0);
      totalDue = totalDue.add(p.dueAmount || 0);
    }

    return reply.send({
      success: true,
      data: {
        summary: {
          billsCount: purchases.length,
          totalSpend: totalSpend.toNumber(),
          totalTax: totalTax.toNumber(),
          totalDiscount: totalDiscount.toNumber(),
          totalPaid: totalPaid.toNumber(),
          totalDue: totalDue.toNumber(),
        },
        rows: purchases,
      },
    });
  });

  // ----------------------------------------------------
  // 3. EXPENSE REPORT API
  // ----------------------------------------------------
  fastify.get('/expenses', async (request, reply) => {
    const { startDate, endDate, category, search } = request.query as {
      startDate?: string;
      endDate?: string;
      category?: string;
      search?: string;
    };

    const whereClause: Prisma.ExpenseWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    if (category) {
      whereClause.category = category;
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { category: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const expenses = await request.db!.expense.findMany({
      where: whereClause,
      include: {
        account: { select: { accountName: true } },
      },
      orderBy: { date: 'desc' },
    });

    let totalExpense = new Prisma.Decimal(0);
    const categoryMap = new Map<string, number>();

    for (const e of expenses) {
      const amt = Number(e.amount || 0);
      totalExpense = totalExpense.add(e.amount || 0);

      const catName = e.category || 'Uncategorized';
      categoryMap.set(catName, (categoryMap.get(catName) || 0) + amt);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, amount]) => ({
      category: name,
      amount,
    }));

    return reply.send({
      success: true,
      data: {
        summary: {
          expensesCount: expenses.length,
          totalExpenseAmount: totalExpense.toNumber(),
          categoriesCount: categoryBreakdown.length,
        },
        categoryBreakdown,
        rows: expenses,
      },
    });
  });

  // ----------------------------------------------------
  // 4. PAYMENT VOUCHERS REPORT API
  // ----------------------------------------------------
  fastify.get('/payments', async (request, reply) => {
    const { startDate, endDate, mode, type } = request.query as {
      startDate?: string;
      endDate?: string;
      mode?: string;
      type?: 'ALL' | 'IN' | 'OUT';
    };

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const hasDateFilter = startDate || endDate;

    const [paymentsIn, paymentsOut] = await Promise.all([
      type === 'OUT'
        ? []
        : request.db!.paymentIn.findMany({
            where: {
              businessId: request.tenant!.businessId,
              ...(hasDateFilter ? { date: dateFilter } : {}),
              ...(mode ? { mode: mode as any } : {}),
            },
            include: { party: { select: { name: true } }, account: { select: { accountName: true } } },
            orderBy: { date: 'desc' },
          }),

      type === 'IN'
        ? []
        : request.db!.paymentOut.findMany({
            where: {
              businessId: request.tenant!.businessId,
              ...(hasDateFilter ? { date: dateFilter } : {}),
              ...(mode ? { mode: mode as any } : {}),
            },
            include: { party: { select: { name: true } }, account: { select: { accountName: true } } },
            orderBy: { date: 'desc' },
          }),
    ]);

    let totalIn = new Prisma.Decimal(0);
    for (const p of paymentsIn) totalIn = totalIn.add(p.amount || 0);

    let totalOut = new Prisma.Decimal(0);
    for (const p of paymentsOut) totalOut = totalOut.add(p.amount || 0);

    return reply.send({
      success: true,
      data: {
        summary: {
          totalPaymentsInCount: paymentsIn.length,
          totalPaymentsInAmount: totalIn.toNumber(),
          totalPaymentsOutCount: paymentsOut.length,
          totalPaymentsOutAmount: totalOut.toNumber(),
          netFlow: totalIn.sub(totalOut).toNumber(),
        },
        paymentsIn,
        paymentsOut,
      },
    });
  });

  // ----------------------------------------------------
  // 5. PARTY BALANCE REPORT API
  // ----------------------------------------------------
  fastify.get('/party-balance', async (request, reply) => {
    const { search, type, categoryId } = request.query as {
      search?: string;
      type?: string;
      categoryId?: string;
    };

    const whereClause: Prisma.PartyWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (type) {
      whereClause.type = type as any;
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const parties = await request.db!.party.findMany({
      where: whereClause,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    let totalReceivables = new Prisma.Decimal(0);
    let totalPayables = new Prisma.Decimal(0);

    for (const p of parties) {
      const bal = new Prisma.Decimal(p.currentBalance || 0);
      if (bal.greaterThan(0)) {
        totalReceivables = totalReceivables.add(bal);
      } else if (bal.lessThan(0)) {
        totalPayables = totalPayables.add(bal.abs());
      }
    }

    return reply.send({
      success: true,
      data: {
        summary: {
          partiesCount: parties.length,
          totalReceivables: totalReceivables.toNumber(),
          totalPayables: totalPayables.toNumber(),
          netBalance: totalReceivables.sub(totalPayables).toNumber(),
        },
        rows: parties,
      },
    });
  });

  // ----------------------------------------------------
  // 6. INVENTORY VALUATION REPORT API
  // ----------------------------------------------------
  fastify.get('/inventory-valuation', async (request, reply) => {
    const { search, categoryId } = request.query as {
      search?: string;
      categoryId?: string;
    };

    const whereClause: Prisma.ItemWhereInput = {
      businessId: request.tenant!.businessId,
      type: 'PRODUCT',
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await request.db!.item.findMany({
      where: whereClause,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    let totalStockQty = new Prisma.Decimal(0);
    let totalCostValuation = new Prisma.Decimal(0);
    let totalSaleValuation = new Prisma.Decimal(0);
    let lowStockCount = 0;

    for (const i of items) {
      const stock = new Prisma.Decimal(i.currentStock || 0);
      const purchasePrice = new Prisma.Decimal(i.purchasePrice || 0);
      const salePrice = new Prisma.Decimal(i.salePrice || 0);
      const minAlert = Number(i.minStockAlert || 0);

      totalStockQty = totalStockQty.add(stock);
      totalCostValuation = totalCostValuation.add(stock.mul(purchasePrice));
      totalSaleValuation = totalSaleValuation.add(stock.mul(salePrice));

      if (stock.toNumber() <= minAlert) {
        lowStockCount++;
      }
    }

    return reply.send({
      success: true,
      data: {
        summary: {
          itemsCount: items.length,
          totalStockQty: totalStockQty.toNumber(),
          totalCostValuation: totalCostValuation.toNumber(),
          totalSaleValuation: totalSaleValuation.toNumber(),
          potentialProfitMargin: totalSaleValuation.sub(totalCostValuation).toNumber(),
          lowStockCount,
        },
        rows: items,
      },
    });
  });

  // ----------------------------------------------------
  // 7. CASHFLOW STATEMENT REPORT API
  // ----------------------------------------------------
  fastify.get('/cashflow-statement', async (request, reply) => {
    const { startDate, endDate, accountId } = request.query as {
      startDate?: string;
      endDate?: string;
      accountId?: string;
    };

    const whereClause: Prisma.TransactionWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    if (accountId) {
      whereClause.accountId = accountId;
    }

    const transactions = await request.db!.transaction.findMany({
      where: whereClause,
      include: {
        account: { select: { accountName: true } },
      },
      orderBy: { date: 'desc' },
    });

    let totalInflow = new Prisma.Decimal(0);
    let totalOutflow = new Prisma.Decimal(0);

    for (const txn of transactions) {
      const amt = new Prisma.Decimal(txn.amount || 0);
      if (
        txn.category === 'SALE' ||
        txn.category === 'PAYMENT_IN' ||
        txn.category === 'INCOME' ||
        txn.category === 'PURCHASE_RETURN'
      ) {
        totalInflow = totalInflow.add(amt);
      } else {
        totalOutflow = totalOutflow.add(amt);
      }
    }

    return reply.send({
      success: true,
      data: {
        summary: {
          transactionsCount: transactions.length,
          totalInflow: totalInflow.toNumber(),
          totalOutflow: totalOutflow.toNumber(),
          netCashflow: totalInflow.sub(totalOutflow).toNumber(),
        },
        rows: transactions,
      },
    });
  });
}

import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { InvoiceStatus, Prisma } from '@bizmanage/database';

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
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
      status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
      NOT: [{ invoiceNumber: { startsWith: 'WEB-' }, status: InvoiceStatus.UNPAID }],
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }
    if (partyId) whereClause.partyId = partyId;
    if (search?.trim()) {
      whereClause.OR = [
        { invoiceNumber: { contains: search.trim() } },
        { party: { name: { contains: search.trim() } } },
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
      status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
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
        { billNumber: { contains: search.trim() } },
        { party: { name: { contains: search.trim() } } },
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
        { category: { contains: search.trim() } },
        { description: { contains: search.trim() } },
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
        { name: { contains: q } },
        { phone: { contains: q } },
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
        { name: { contains: q } },
        { code: { contains: q } },
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

  // ----------------------------------------------------
  // 8. BALANCE SHEET REPORT API
  // ----------------------------------------------------
  fastify.get('/balance-sheet', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { asOfDate } = request.query as { asOfDate?: string };

    const dateFilter = asOfDate ? { lte: new Date(asOfDate) } : undefined;

    const [
      accounts,
      parties,
      items,
      salesTaxAgg,
      purchasesTaxAgg,
      salesAgg,
      purchasesAgg,
      expensesAgg,
      incomeAgg,
    ] = await Promise.all([
      request.db!.account.findMany({
        where: { businessId },
        select: { id: true, accountName: true, bankName: true, accountType: true, balance: true, accountNumber: true },
        orderBy: { accountName: 'asc' },
      }),
      request.db!.party.findMany({
        where: { businessId },
        select: { id: true, name: true, phone: true, type: true, currentBalance: true },
        orderBy: { name: 'asc' },
      }),
      request.db!.item.findMany({
        where: { businessId },
        select: { id: true, name: true, currentStock: true, purchasePrice: true, salePrice: true },
      }),
      request.db!.sale.aggregate({
        where: {
          businessId,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { taxAmount: true },
      }),
      request.db!.purchase.aggregate({
        where: {
          businessId,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { taxAmount: true },
      }),
      request.db!.sale.aggregate({
        where: {
          businessId,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true, taxAmount: true },
      }),
      request.db!.purchase.aggregate({
        where: {
          businessId,
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true, taxAmount: true },
      }),
      request.db!.expense.aggregate({
        where: {
          businessId,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      request.db!.income.aggregate({
        where: {
          businessId,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    // 1. Current Assets
    const cashAccounts = accounts.filter((a) => a.accountType === 'CASH');
    const bankAccounts = accounts.filter((a) => a.accountType === 'BANK' || a.accountType === 'MOBILE_WALLET');

    const cashInHand = cashAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const bankAndWallets = bankAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

    const debtors = parties.filter((p) => Number(p.currentBalance || 0) > 0);
    const sundryDebtors = debtors.reduce((sum, p) => sum + Number(p.currentBalance || 0), 0);

    const stockValuation = items.reduce(
      (sum, i) => sum + Math.max(0, Number(i.currentStock || 0)) * Number(i.purchasePrice || 0),
      0
    );

    const currentAssets = cashInHand + bankAndWallets + sundryDebtors + stockValuation;
    const fixedAssets = 0; // Configurable fixed assets
    const totalAssets = currentAssets + fixedAssets;

    // 2. Current Liabilities
    const creditors = parties.filter((p) => Number(p.currentBalance || 0) < 0);
    const sundryCreditors = creditors.reduce((sum, p) => sum + Math.abs(Number(p.currentBalance || 0)), 0);

    const outputVat = Number(salesTaxAgg._sum.taxAmount || 0);
    const inputVat = Number(purchasesTaxAgg._sum.taxAmount || 0);
    const taxPayable = Math.max(0, outputVat - inputVat);

    const totalLiabilities = sundryCreditors + taxPayable;

    // 3. Equity & Retained Earnings
    const netSales = Number(salesAgg._sum.totalAmount || 0) - outputVat;
    const netPurchases = Number(purchasesAgg._sum.totalAmount || 0) - inputVat;
    const totalExpenses = Number(expensesAgg._sum.amount || 0);
    const totalOtherIncome = Number(incomeAgg._sum.amount || 0);

    // Cumulative Net Profit / (Loss) = (Revenue + Income + Ending Stock) - (Purchases + Expenses)
    const netProfit = (netSales + totalOtherIncome + stockValuation) - (netPurchases + totalExpenses);
    const ownersEquity = totalAssets - totalLiabilities;
    const ownerCapital = ownersEquity - netProfit;

    return reply.send({
      success: true,
      data: {
        asOfDate: asOfDate || new Date().toISOString(),
        assets: {
          current: {
            cashInHand,
            cashAccounts,
            bankAndWallets,
            bankAccounts,
            sundryDebtors,
            debtorsCount: debtors.length,
            debtorsList: debtors.slice(0, 50).map((d) => ({ ...d, balance: Number(d.currentBalance || 0) })),
            stockValuation,
            itemsCount: items.length,
            total: currentAssets,
          },
          fixed: {
            total: fixedAssets,
          },
          totalAssets,
        },
        liabilities: {
          current: {
            sundryCreditors,
            creditorsCount: creditors.length,
            creditorsList: creditors.slice(0, 50).map((c) => ({ ...c, balance: Math.abs(Number(c.currentBalance || 0)) })),
            taxPayable,
            outputVat,
            inputVat,
            total: totalLiabilities,
          },
          totalLiabilities,
        },
        equity: {
          ownerCapital,
          netProfit,
          totalEquity: ownersEquity,
          totalLiabilitiesAndEquity: totalLiabilities + ownersEquity,
        },
        ratios: {
          currentRatio: totalLiabilities > 0 ? Number((currentAssets / totalLiabilities).toFixed(2)) : null,
          quickRatio: totalLiabilities > 0 ? Number(((currentAssets - stockValuation) / totalLiabilities).toFixed(2)) : null,
          debtToEquity: ownersEquity > 0 ? Number((totalLiabilities / ownersEquity).toFixed(2)) : null,
        },
      },
    });
  });
}


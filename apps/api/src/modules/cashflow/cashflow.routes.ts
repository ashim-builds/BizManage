import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { TransactionCategory, Prisma } from '@bizmanage/database';

export async function cashflowRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // GET CASHFLOW OVERVIEW & ACCOUNT BALANCES
  // ----------------------------------------------------
  fastify.get('/summary', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    // 1. Total Liquidity from Accounts
    const accounts = await request.db!.account.findMany({
      where: { businessId },
    });

    let totalLiquidity = new Prisma.Decimal(0);
    for (const acc of accounts) {
      totalLiquidity = totalLiquidity.add(acc.balance || 0);
    }

    // 2. All Transactions for Money In / Money Out aggregation
    const transactions = await request.db!.transaction.findMany({
      where: { businessId },
      orderBy: { date: 'desc' },
    });

    let totalMoneyIn = new Prisma.Decimal(0);
    let totalMoneyOut = new Prisma.Decimal(0);

    for (const txn of transactions) {
      const amt = new Prisma.Decimal(txn.amount || 0);
      if (
        txn.category === TransactionCategory.SALE ||
        txn.category === TransactionCategory.PAYMENT_IN ||
        txn.category === TransactionCategory.INCOME ||
        txn.category === TransactionCategory.PURCHASE_RETURN
      ) {
        totalMoneyIn = totalMoneyIn.add(amt);
      } else if (
        txn.category === TransactionCategory.PURCHASE ||
        txn.category === TransactionCategory.PAYMENT_OUT ||
        txn.category === TransactionCategory.EXPENSE ||
        txn.category === TransactionCategory.SALE_RETURN
      ) {
        totalMoneyOut = totalMoneyOut.add(amt);
      }
    }

    const netCashflow = totalMoneyIn.sub(totalMoneyOut);

    return reply.send({
      success: true,
      data: {
        totalLiquidity: totalLiquidity.toNumber(),
        totalMoneyIn: totalMoneyIn.toNumber(),
        totalMoneyOut: totalMoneyOut.toNumber(),
        netCashflow: netCashflow.toNumber(),
        accountsCount: accounts.length,
      },
    });
  });

  // ----------------------------------------------------
  // GET DAILY CASHFLOW (LAST 7 DAYS)
  // ----------------------------------------------------
  fastify.get('/daily', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    // Generate last 7 days date strings (YYYY-MM-DD)
    const days: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      if (iso) days.push(iso);
    }

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const transactions = await request.db!.transaction.findMany({
      where: {
        businessId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    const dailyDataMap = new Map<
      string,
      { date: string; moneyIn: number; moneyOut: number; net: number }
    >();

    for (const day of days) {
      dailyDataMap.set(day, { date: day, moneyIn: 0, moneyOut: 0, net: 0 });
    }

    for (const txn of transactions) {
      const dayStr = new Date(txn.date).toISOString().split('T')[0] || '';
      const entry = dailyDataMap.get(dayStr);
      if (entry) {
        const amt = Number(txn.amount || 0);
        if (
          txn.category === TransactionCategory.SALE ||
          txn.category === TransactionCategory.PAYMENT_IN ||
          txn.category === TransactionCategory.INCOME ||
          txn.category === TransactionCategory.PURCHASE_RETURN
        ) {
          entry.moneyIn += amt;
        } else {
          entry.moneyOut += amt;
        }
        entry.net = entry.moneyIn - entry.moneyOut;
      }
    }

    return reply.send({
      success: true,
      data: Array.from(dailyDataMap.values()),
    });
  });

  // ----------------------------------------------------
  // GET MONTHLY CASHFLOW (LAST 12 MONTHS)
  // ----------------------------------------------------
  fastify.get('/monthly', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    // Generate last 12 month strings (YYYY-MM)
    const months: string[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);
    }

    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    const transactions = await request.db!.transaction.findMany({
      where: {
        businessId,
        date: { gte: twelveMonthsAgo },
      },
      orderBy: { date: 'asc' },
    });

    const monthlyDataMap = new Map<
      string,
      { month: string; moneyIn: number; moneyOut: number; net: number }
    >();

    for (const m of months) {
      monthlyDataMap.set(m, { month: m, moneyIn: 0, moneyOut: 0, net: 0 });
    }

    for (const txn of transactions) {
      const d = new Date(txn.date);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyDataMap.get(monthStr);
      if (entry) {
        const amt = Number(txn.amount || 0);
        if (
          txn.category === TransactionCategory.SALE ||
          txn.category === TransactionCategory.PAYMENT_IN ||
          txn.category === TransactionCategory.INCOME ||
          txn.category === TransactionCategory.PURCHASE_RETURN
        ) {
          entry.moneyIn += amt;
        } else {
          entry.moneyOut += amt;
        }
        entry.net = entry.moneyIn - entry.moneyOut;
      }
    }

    return reply.send({
      success: true,
      data: Array.from(monthlyDataMap.values()),
    });
  });

  // ----------------------------------------------------
  // GET CASH & BANK ACCOUNTS BREAKDOWN
  // ----------------------------------------------------
  fastify.get('/accounts', async (request, reply) => {
    const accounts = await request.db!.account.findMany({
      where: { businessId: request.tenant!.businessId },
      orderBy: { accountName: 'asc' },
    });

    return reply.send({
      success: true,
      data: accounts,
    });
  });
  // ----------------------------------------------------
  // GET UNIFIED TRANSACTIONS LIST (WITH PAGINATION)
  // ----------------------------------------------------
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      category?: TransactionCategory;
      startDate?: string;
      endDate?: string;
    };
  }>('/transactions', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { page = '1', limit = '50', category, startDate, endDate } = request.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { businessId };

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [transactions, total] = await Promise.all([
      request.db!.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take,
        include: {
          account: {
            select: { accountName: true, accountType: true }
          }
        }
      }),
      request.db!.transaction.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: transactions,
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      }
    });
  });
}

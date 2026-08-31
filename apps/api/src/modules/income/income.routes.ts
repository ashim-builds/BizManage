import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { createIncomeSchema } from '@bizmanage/validation';
import { PaymentMode, TransactionCategory, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';

export async function incomeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // GET INCOME SUMMARY
  fastify.get('/summary', async (request, reply) => {
    const incomes = await request.db!.income.findMany({
      select: { amount: true, date: true, category: true },
    });

    let totalIncome = new Prisma.Decimal(0);
    let todayIncome = new Prisma.Decimal(0);
    const todayStr = new Date().toISOString().split('T')[0];

    for (const inc of incomes) {
      const amt = new Prisma.Decimal(inc.amount || 0);
      totalIncome = totalIncome.add(amt);

      if (new Date(inc.date).toISOString().split('T')[0] === todayStr) {
        todayIncome = todayIncome.add(amt);
      }
    }

    return reply.send({
      success: true,
      data: {
        totalIncomeCount: incomes.length,
        totalIncomeAmount: totalIncome.toNumber(),
        todayIncomeAmount: todayIncome.toNumber(),
      },
    });
  });

  // LIST OTHER INCOMES
  fastify.get('/', async (request, reply) => {
    const { search, category, paymentMode, startDate, endDate, page = '1', limit = '50' } = request.query as {
      search?: string;
      category?: string;
      paymentMode?: PaymentMode;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.IncomeWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (category) {
      whereClause.category = category;
    }

    if (paymentMode) {
      whereClause.paymentMode = paymentMode;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { category: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const [incomes, total] = await Promise.all([
      request.db!.income.findMany({
        where: whereClause,
        include: {
          account: { select: { id: true, accountName: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      request.db!.income.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: incomes,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // CREATE OTHER INCOME (Transaction-Safe)
  fastify.post('/', async (request, reply) => {
    const body = createIncomeSchema.parse(request.body);

    const newIncome = await request.db!.$transaction(async (tx) => {
      const amt = new Prisma.Decimal(body.amount);

      let targetAccount = body.accountId
        ? await tx.account.findFirst({ where: { id: body.accountId , businessId: request.tenant!.businessId } })
        : await tx.account.findFirst({ where: { businessId: request.tenant!.businessId } });

      if (!targetAccount) {
        targetAccount = await tx.account.create({
          data: {
            businessId: request.tenant!.businessId,
            accountName: 'Main Cash Account',
            accountType: 'CASH',
          },
        });
      }

      // 1. Create Income Record
      const income = await tx.income.create({
        data: {
          businessId: request.tenant!.businessId,
          accountId: targetAccount.id,
          category: body.category,
          amount: amt,
          paymentMode: body.paymentMode,
          date: new Date(body.date),
          description: body.description || null,
        },
        include: {
          account: { select: { id: true, accountName: true } },
        },
      });

      // 2. Increase Cash/Bank Account Balance
      const curAccBal = new Prisma.Decimal(targetAccount.balance || 0);
      const newAccBal = curAccBal.add(amt);
      await tx.account.update({
        where: { id: targetAccount.id },
        data: { balance: newAccBal },
      });

      // 3. Create Transaction Entry
      await tx.transaction.create({
        data: {
          businessId: request.tenant!.businessId,
          accountId: targetAccount.id,
          category: TransactionCategory.INCOME,
          amount: amt,
          referenceId: income.id,
          description: body.description || `Other Income: ${body.category}`,
          date: new Date(body.date),
        },
      });

      return income;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.status(201).send({
      success: true,
      data: newIncome,
    });
  });

  // DELETE OTHER INCOME (Transaction-Safe Deduct)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await request.db!.$transaction(async (tx) => {
      const income = await tx.income.findUnique({ where: { id } });
      if (!income) {
        throw new AppError('Income record not found', 404, 'NOT_FOUND');
      }

      if (income.status === 'VOIDED') {
        throw new AppError('Income is already voided', 400, 'BAD_REQUEST');
      }

      const amt = new Prisma.Decimal(income.amount || 0);

      const account = await tx.account.findFirst({ where: { id: income.accountId , businessId: request.tenant!.businessId } });
      if (account) {
        const curBal = new Prisma.Decimal(account.balance || 0);
        await tx.account.update({
          where: { id: account.id },
          data: { balance: curBal.sub(amt) },
        });
      }

      await tx.transaction.deleteMany({ where: { referenceId: id } });
      await tx.income.update({
        where: { id },
        data: { status: 'VOIDED' },
      });
    }, { maxWait: 10000, timeout: 20000 });

    return reply.send({
      success: true,
      data: { message: 'Income record voided successfully' },
    });
  });
}

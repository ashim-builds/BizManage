import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { createExpenseSchema } from '@bizmanage/validation';
import { PaymentMode, TransactionCategory, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';
import { updateAccountBalance } from '../../services/accounting.service.js';

export async function expenseRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // GET EXPENSES SUMMARY
  fastify.get('/summary', async (request, reply) => {
    const expenses = await request.db!.expense.findMany({
      select: { amount: true, date: true, category: true },
    });

    let totalExpenses = new Prisma.Decimal(0);
    let todayExpenses = new Prisma.Decimal(0);
    const todayStr = new Date().toISOString().split('T')[0];

    for (const e of expenses) {
      const amt = new Prisma.Decimal(e.amount || 0);
      totalExpenses = totalExpenses.add(amt);

      if (new Date(e.date).toISOString().split('T')[0] === todayStr) {
        todayExpenses = todayExpenses.add(amt);
      }
    }

    return reply.send({
      success: true,
      data: {
        totalExpensesCount: expenses.length,
        totalExpensesAmount: totalExpenses.toNumber(),
        todayExpensesAmount: todayExpenses.toNumber(),
      },
    });
  });

  // LIST EXPENSES
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

    const whereClause: Prisma.ExpenseWhereInput = {
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
        { category: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      request.db!.expense.findMany({
        where: whereClause,
        include: {
          account: { select: { id: true, accountName: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      request.db!.expense.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: expenses,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // CREATE EXPENSE (Transaction-Safe)
  fastify.post('/', async (request, reply) => {
    const body = createExpenseSchema.parse(request.body);

    const newExpense = await request.db!.$transaction(async (tx) => {
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

      // 1. Create Expense Record
      const expense = await tx.expense.create({
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

      // 2. Decrease Cash/Bank Account Balance
      // We do a manual fetch to check balance before atomic update
      const curAccBal = new Prisma.Decimal(targetAccount.balance || 0);
      if (curAccBal.sub(amt).lessThan(0)) {
        throw new AppError('Insufficient balance in the selected account. Please add funds or change payment method.', 400, 'VALIDATION_ERROR');
      }

      await updateAccountBalance(tx as any, targetAccount.id, request.tenant!.businessId, amt.toNumber(), 'REDUCE');

      // 3. Create Transaction Entry
      await tx.transaction.create({
        data: {
          businessId: request.tenant!.businessId,
          accountId: targetAccount.id,
          category: TransactionCategory.EXPENSE,
          amount: amt,
          referenceId: expense.id,
          description: body.description || `Expense: ${body.category}`,
          date: new Date(body.date),
        },
      });

      return expense;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.status(201).send({
      success: true,
      data: newExpense,
    });
  });

  // DELETE EXPENSE (Transaction-Safe Restore)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await request.db!.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id } });
      if (!expense) {
        throw new AppError('Expense record not found', 404, 'NOT_FOUND');
      }

      if (expense.status === 'VOIDED') {
        throw new AppError('Expense is already voided', 400, 'BAD_REQUEST');
      }

      const amt = new Prisma.Decimal(expense.amount || 0);

      // Restore account balance
      await updateAccountBalance(tx as any, expense.accountId, request.tenant!.businessId, amt.toNumber(), 'ADD');

      await tx.transaction.deleteMany({ where: { referenceId: id } });
      await tx.expense.update({
        where: { id },
        data: { status: 'VOIDED' },
      });
    }, { maxWait: 10000, timeout: 20000 });

    return reply.send({
      success: true,
      data: { message: 'Expense record voided successfully' },
    });
  });
}

import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { AccountType, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';
import { z } from 'zod';

const createAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountType: z.nativeEnum(AccountType).default(AccountType.CASH),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  openingBalance: z.number().default(0),
});

const updateAccountSchema = createAccountSchema.partial();

export async function accountRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // GET ALL ACCOUNTS
  fastify.get('/', async (request, reply) => {
    const accounts = await request.db!.account.findMany({
      where: { businessId: request.tenant!.businessId },
      orderBy: [{ accountType: 'asc' }, { accountName: 'asc' }],
    });

    const totalBalance = accounts.reduce(
      (acc, a) => acc.add(new Prisma.Decimal(a.balance || 0)),
      new Prisma.Decimal(0)
    );

    return reply.send({
      success: true,
      data: accounts,
      meta: { totalBalance: totalBalance.toNumber() },
    });
  });

  // CREATE ACCOUNT
  fastify.post('/', async (request, reply) => {
    const body = createAccountSchema.parse(request.body);

    // Check for duplicate name in same business
    const existing = await request.db!.account.findFirst({
      where: {
        businessId: request.tenant!.businessId,
        accountName: { equals: body.accountName },
      },
    });

    if (existing) {
      throw new AppError('An account with this name already exists', 400, 'DUPLICATE');
    }

    const account = await request.db!.account.create({
      data: {
        businessId: request.tenant!.businessId,
        accountName: body.accountName,
        accountType: body.accountType,
        accountNumber: body.accountNumber || null,
        bankName: body.bankName || null,
        balance: new Prisma.Decimal(body.openingBalance || 0),
      },
    });

    return reply.status(201).send({ success: true, data: account });
  });

  // UPDATE ACCOUNT
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateAccountSchema.parse(request.body);

    const account = await request.db!.account.findFirst({
      where: { id, businessId: request.tenant!.businessId },
    });

    if (!account) {
      throw new AppError('Account not found', 404, 'NOT_FOUND');
    }

    const updated = await request.db!.account.update({
      where: { id },
      data: {
        accountName: body.accountName,
        accountType: body.accountType,
        accountNumber: body.accountNumber ?? account.accountNumber,
        bankName: body.bankName ?? account.bankName,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // DELETE ACCOUNT
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const account = await request.db!.account.findFirst({
      where: { id, businessId: request.tenant!.businessId },
    });

    if (!account) {
      throw new AppError('Account not found', 404, 'NOT_FOUND');
    }

    // Safety check — don't delete accounts with active transactions
    const txCount = await request.db!.transaction.count({ where: { accountId: id } });
    if (txCount > 0) {
      throw new AppError(
        `Cannot delete this account — it has ${txCount} transaction(s) linked to it.`,
        400,
        'HAS_TRANSACTIONS'
      );
    }

    await request.db!.account.delete({ where: { id } });
    return reply.send({ success: true, message: 'Account deleted' });
  });
}

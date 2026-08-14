import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { AppError } from '../../plugins/error-handler.js';
import { z } from 'zod';
import { updateAccountBalance } from '../../services/accounting.service.js';
import { Prisma } from '@bizmanage/database';

const transferSchema = z.object({
  fromAccountId: z.string().uuid('Invalid from account ID'),
  toAccountId: z.string().uuid('Invalid to account ID'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  notes: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
});

export async function transferRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // POST /transfers
  fastify.post('/', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const body = transferSchema.parse(request.body);

    if (body.fromAccountId === body.toAccountId) {
      throw new AppError('Cannot transfer to the same account', 400, 'VALIDATION_ERROR');
    }

    // Verify both accounts exist and belong to the business
    const [fromAccount, toAccount] = await Promise.all([
      request.db!.account.findFirst({ where: { id: body.fromAccountId, businessId } }),
      request.db!.account.findFirst({ where: { id: body.toAccountId, businessId } }),
    ]);

    if (!fromAccount) throw new AppError('Source account not found', 404, 'NOT_FOUND');
    if (!toAccount) throw new AppError('Destination account not found', 404, 'NOT_FOUND');

    // Create Transfer atomically
    const result = await request.db!.$transaction(async (tx) => {
      // 1. Create the AccountTransfer record
      const transfer = await tx.accountTransfer.create({
        data: {
          businessId,
          fromAccountId: body.fromAccountId,
          toAccountId: body.toAccountId,
          amount: body.amount,
          date: body.date,
          notes: body.notes,
          referenceNumber: body.referenceNumber,
        },
      });

      // 2. Reduce balance from source account
      await updateAccountBalance(tx as any, body.fromAccountId, body.amount, 'REDUCE');

      // 3. Increase balance to destination account
      await updateAccountBalance(tx as any, body.toAccountId, body.amount, 'ADD');

      // 4. Record transactions for history (optional, but good for ledger)
      await tx.transaction.create({
        data: {
          businessId,
          accountId: body.fromAccountId,
          category: 'TRANSFER', // Logically an outgoing flow for the account
          amount: body.amount,
          date: body.date,
          description: `Transfer to ${toAccount.accountName}`,
          referenceId: transfer.id,
        },
      });

      await tx.transaction.create({
        data: {
          businessId,
          accountId: body.toAccountId,
          category: 'TRANSFER', // Logically an incoming flow for the account
          amount: body.amount,
          date: body.date,
          description: `Transfer from ${fromAccount.accountName}`,
          referenceId: transfer.id,
        },
      });

      return transfer;
    });

    return reply.status(201).send({ success: true, data: result });
  });

  // GET /transfers
  fastify.get('/', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const transfers = await request.db!.accountTransfer.findMany({
      where: { businessId },
      include: {
        fromAccount: { select: { accountName: true, accountType: true } },
        toAccount: { select: { accountName: true, accountType: true } },
      },
      orderBy: { date: 'desc' },
    });

    return reply.send({ success: true, data: transfers });
  });
}

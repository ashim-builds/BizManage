import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import {
  createPaymentInSchema,
  createPaymentOutSchema,
} from '@bizmanage/validation';
import {
  PaymentMode,
  TransactionCategory,
  AccountType,
  Prisma,
} from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';
import { updateAccountBalance } from '../../services/accounting.service.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ====================================================
  // PAYMENT IN (Customer Collections)
  // ====================================================

  // GET PAYMENT IN SUMMARY
  fastify.get('/in/summary', async (request, reply) => {
    const payments = await request.db!.paymentIn.findMany({
      select: {
        amount: true,
        date: true,
      },
    });

    let totalCollected = new Prisma.Decimal(0);
    let todayCollected = new Prisma.Decimal(0);

    const todayStr = new Date().toISOString().split('T')[0];

    for (const p of payments) {
      const amt = new Prisma.Decimal(p.amount || 0);

      totalCollected = totalCollected.add(amt);

      if (p.date && !isNaN(new Date(p.date).getTime())) {
        if (
          new Date(p.date).toISOString().split('T')[0] ===
          todayStr
        ) {
          todayCollected = todayCollected.add(amt);
        }
      }
    }

    return reply.send({
      success: true,
      data: {
        totalVouchersCount: payments.length,
        totalCollectedAmount: totalCollected.toNumber(),
        todayCollectedAmount: todayCollected.toNumber(),
      },
    });
  });

  // ====================================================
  // LIST PAYMENT IN RECORDS
  // ====================================================

  fastify.get('/in', async (request, reply) => {
    const {
      search,
      partyId,
      mode,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = request.query as {
      search?: string;
      partyId?: string;
      mode?: PaymentMode;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit, 10))
    );

    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.PaymentInWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (partyId) {
      whereClause.partyId = partyId;
    }

    if (mode) {
      whereClause.mode = mode;
    }

    if (startDate || endDate) {
      whereClause.date = {};

      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }

      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    if (search && search.trim()) {
      const q = search.trim();

      whereClause.OR = [
        {
          referenceNumber: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          party: {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          },
        },
        {
          notes: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      request.db!.paymentIn.findMany({
        where: whereClause,
        include: {
          party: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          account: {
            select: {
              id: true,
              accountName: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limitNum,
      }),

      request.db!.paymentIn.count({
        where: whereClause,
      }),
    ]);

    return reply.send({
      success: true,
      data: payments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // ====================================================
  // CREATE PAYMENT IN
  // ====================================================

  fastify.post('/in', async (request, reply) => {
    const body = createPaymentInSchema.parse(request.body);

    const paymentIn = await request.db!.$transaction(
      async (tx) => {
        // ------------------------------------------------
        // 1. Find customer
        // ------------------------------------------------

        const party = await tx.party.findUnique({
          where: {
            id: body.partyId,
          },
        });

        if (!party) {
          throw new AppError(
            'Customer party not found',
            404,
            'NOT_FOUND'
          );
        }

        const amt = new Prisma.Decimal(body.amount);

        // ------------------------------------------------
        // 2. Determine account type
        // ------------------------------------------------

        const desiredType =
          body.mode === PaymentMode.BANK ||
            body.mode === PaymentMode.CHEQUE
            ? AccountType.BANK
            : body.mode === PaymentMode.ONLINE
              ? AccountType.MOBILE_WALLET
              : AccountType.CASH;

        // ------------------------------------------------
        // 3. Find or create account
        // ------------------------------------------------

        let targetAccount = body.accountId
          ? await tx.account.findUnique({
            where: {
              id: body.accountId,
            },
          })
          : await tx.account.findFirst({
            where: {
              businessId: request.tenant!.businessId,
              accountType: desiredType,
            },
          });

        if (
          !targetAccount ||
          (
            body.mode !== PaymentMode.CASH &&
            targetAccount.accountType === AccountType.CASH &&
            !body.accountId
          )
        ) {
          const defaultName =
            desiredType === AccountType.BANK
              ? 'Main Bank Account'
              : desiredType === AccountType.MOBILE_WALLET
                ? 'Mobile Wallet Account'
                : 'Main Cash Account';

          targetAccount = await tx.account.create({
            data: {
              businessId: request.tenant!.businessId,
              accountName: defaultName,
              accountType: desiredType,
              balance: new Prisma.Decimal(0),
            },
          });
        }

        // ------------------------------------------------
        // 4. Create PaymentIn record
        // ------------------------------------------------

        const newPayment = await tx.paymentIn.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId: body.partyId,
            accountId: targetAccount.id,
            amount: amt,
            mode: body.mode,
            date: new Date(body.date),
            referenceNumber: body.referenceNumber || null,
            notes: body.notes || null,
          },

          include: {
            party: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            account: {
              select: {
                id: true,
                accountName: true,
              },
            },
          },
        });

        // ------------------------------------------------
        // 5. Reduce Customer Receivable Balance
        // ------------------------------------------------

        const curBal = new Prisma.Decimal(
          party.currentBalance || 0
        );

        const newBal = curBal.sub(amt);

        await tx.party.update({
          where: {
            id: body.partyId,
          },
          data: {
            currentBalance: newBal,
          },
        });

        // ------------------------------------------------
        // 6. Increase Cash/Bank Account Balance
        // ------------------------------------------------

        const curAccBal = new Prisma.Decimal(
          targetAccount.balance || 0
        );

        const newAccBal = curAccBal.add(amt);

        await tx.account.update({
          where: {
            id: targetAccount.id,
          },
          data: {
            balance: newAccBal,
          },
        });

        // ------------------------------------------------
        // 7. Reduce unpaid sales invoices FIFO
        // ------------------------------------------------

        const unpaidSales = await tx.sale.findMany({
          where: {
            businessId: request.tenant!.businessId,
            partyId: body.partyId,
            status: {
              in: ['UNPAID', 'PARTIAL'],
            },
            dueAmount: {
              gt: 0,
            },
          },
          orderBy: {
            date: 'asc',
          },
        });

        let remainingPayment = new Prisma.Decimal(amt);

        for (const sale of unpaidSales) {
          if (remainingPayment.lessThanOrEqualTo(0)) {
            break;
          }

          const saleDue = new Prisma.Decimal(
            sale.dueAmount || 0
          );

          const reduction =
            remainingPayment.greaterThanOrEqualTo(saleDue)
              ? saleDue
              : remainingPayment;

          const newDue = saleDue.sub(reduction);

          const newPaid = new Prisma.Decimal(
            sale.paidAmount || 0
          ).add(reduction);

          const newStatus = newDue.lessThanOrEqualTo(0)
            ? 'PAID'
            : 'PARTIAL';

          await tx.sale.update({
            where: {
              id: sale.id,
            },
            data: {
              dueAmount: newDue,
              paidAmount: newPaid,
              status: newStatus as any,
            },
          });

          remainingPayment = remainingPayment.sub(
            reduction
          );
        }

        // ------------------------------------------------
        // 8. Create Transaction Entry
        // ------------------------------------------------

        await tx.transaction.create({
          data: {
            businessId: request.tenant!.businessId,
            accountId: targetAccount.id,
            category: TransactionCategory.PAYMENT_IN,
            amount: amt,
            referenceId: newPayment.id,
            description:
              body.notes ||
              `Payment received from ${party.name}`,
            date: new Date(body.date),
          },
        });

        return newPayment;
      },

      // IMPORTANT:
      // Prisma default interactive transaction timeout = 5000ms
      // Render production database can take longer.
      {
        timeout: 15000,
      }
    );

    return reply.status(201).send({
      success: true,
      data: paymentIn,
    });
  });

  // ====================================================
  // GET PAYMENT IN BY ID
  // ====================================================

  fastify.get('/in/:id', async (request, reply) => {
    const { id } = request.params as {
      id: string;
    };

    const payment = await request.db!.paymentIn.findFirst({
      where: {
        id,
        businessId: request.tenant!.businessId,
      },

      include: {
        party: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            currentBalance: true,
          },
        },

        account: {
          select: {
            id: true,
            accountName: true,
            accountType: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(
        'Payment In record not found',
        404,
        'NOT_FOUND'
      );
    }

    return reply.send({
      success: true,
      data: payment,
    });
  });

  // ====================================================
  // VOID PAYMENT IN
  // ====================================================

  fastify.post('/in/:id/void', async (request, reply) => {
    const { id } = request.params as {
      id: string;
    };

    const result = await request.db!.$transaction(
      async (tx) => {
        // ------------------------------------------------
        // 1. Find payment
        // ------------------------------------------------

        const payment = await tx.paymentIn.findFirst({
          where: {
            id,
            businessId: request.tenant!.businessId,
          },
        });

        if (!payment) {
          throw new AppError(
            'Payment In record not found',
            404,
            'NOT_FOUND'
          );
        }

        if (payment.status === 'VOIDED') {
          throw new AppError(
            'Payment is already voided',
            400,
            'BAD_REQUEST'
          );
        }

        const amt = new Prisma.Decimal(payment.amount);

        // ------------------------------------------------
        // 2. Revert Customer Receivable Balance
        // ------------------------------------------------

        await tx.party.update({
          where: {
            id: payment.partyId,
          },
          data: {
            currentBalance: {
              increment: amt,
            },
          },
        });

        // ------------------------------------------------
        // 3. Reduce Account Balance
        // ------------------------------------------------

        await updateAccountBalance(
          tx as any,
          payment.accountId,
          amt,
          'REDUCE'
        );

        // ------------------------------------------------
        // 4. Remove transaction record
        // ------------------------------------------------

        await tx.transaction.deleteMany({
          where: {
            referenceId: id,
          },
        });

        // ------------------------------------------------
        // 5. Mark payment as VOIDED
        // ------------------------------------------------

        const updatedPayment = await tx.paymentIn.update({
          where: {
            id,
          },
          data: {
            status: 'VOIDED',
          },
        });

        return updatedPayment;
      },

      // IMPORTANT
      {
        timeout: 15000,
      }
    );

    return reply.send({
      success: true,
      data: result,
      message: 'Payment In record voided successfully',
    });
  });

  // ====================================================
  // PAYMENT OUT (Supplier Payouts)
  // ====================================================

  // GET PAYMENT OUT SUMMARY

  fastify.get('/out/summary', async (request, reply) => {
    const payments = await request.db!.paymentOut.findMany({
      select: {
        amount: true,
        date: true,
      },
    });

    let totalPaidOut = new Prisma.Decimal(0);
    let todayPaidOut = new Prisma.Decimal(0);

    const todayStr = new Date().toISOString().split('T')[0];

    for (const p of payments) {
      const amt = new Prisma.Decimal(p.amount || 0);

      totalPaidOut = totalPaidOut.add(amt);

      if (p.date && !isNaN(new Date(p.date).getTime())) {
        if (
          new Date(p.date).toISOString().split('T')[0] ===
          todayStr
        ) {
          todayPaidOut = todayPaidOut.add(amt);
        }
      }
    }

    return reply.send({
      success: true,
      data: {
        totalVouchersCount: payments.length,
        totalPaidAmount: totalPaidOut.toNumber(),
        todayPaidAmount: todayPaidOut.toNumber(),
      },
    });
  });

  // ====================================================
  // LIST PAYMENT OUT RECORDS
  // ====================================================

  fastify.get('/out', async (request, reply) => {
    const {
      search,
      partyId,
      mode,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = request.query as {
      search?: string;
      partyId?: string;
      mode?: PaymentMode;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit, 10))
    );

    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.PaymentOutWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (partyId) {
      whereClause.partyId = partyId;
    }

    if (mode) {
      whereClause.mode = mode;
    }

    if (startDate || endDate) {
      whereClause.date = {};

      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }

      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    if (search && search.trim()) {
      const q = search.trim();

      whereClause.OR = [
        {
          referenceNumber: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          party: {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          },
        },
        {
          notes: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      request.db!.paymentOut.findMany({
        where: whereClause,

        include: {
          party: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },

          account: {
            select: {
              id: true,
              accountName: true,
            },
          },
        },

        orderBy: {
          date: 'desc',
        },

        skip,
        take: limitNum,
      }),

      request.db!.paymentOut.count({
        where: whereClause,
      }),
    ]);

    return reply.send({
      success: true,
      data: payments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // ====================================================
  // CREATE PAYMENT OUT
  // ====================================================

  fastify.post('/out', async (request, reply) => {
    const body = createPaymentOutSchema.parse(
      request.body
    );

    const paymentOut = await request.db!.$transaction(
      async (tx) => {
        // ------------------------------------------------
        // 1. Find supplier
        // ------------------------------------------------

        const party = await tx.party.findUnique({
          where: {
            id: body.partyId,
          },
        });

        if (!party) {
          throw new AppError(
            'Supplier party not found',
            404,
            'NOT_FOUND'
          );
        }

        const amt = new Prisma.Decimal(body.amount);

        // ------------------------------------------------
        // 2. Determine account type
        // ------------------------------------------------

        const desiredType =
          body.mode === PaymentMode.BANK ||
            body.mode === PaymentMode.CHEQUE
            ? AccountType.BANK
            : body.mode === PaymentMode.ONLINE
              ? AccountType.MOBILE_WALLET
              : AccountType.CASH;

        // ------------------------------------------------
        // 3. Find or create account
        // ------------------------------------------------

        let targetAccount = body.accountId
          ? await tx.account.findUnique({
            where: {
              id: body.accountId,
            },
          })
          : await tx.account.findFirst({
            where: {
              businessId: request.tenant!.businessId,
              accountType: desiredType,
            },
          });

        if (
          !targetAccount ||
          (
            body.mode !== PaymentMode.CASH &&
            targetAccount.accountType === AccountType.CASH &&
            !body.accountId
          )
        ) {
          const defaultName =
            desiredType === AccountType.BANK
              ? 'Main Bank Account'
              : desiredType === AccountType.MOBILE_WALLET
                ? 'Mobile Wallet Account'
                : 'Main Cash Account';

          targetAccount = await tx.account.create({
            data: {
              businessId: request.tenant!.businessId,
              accountName: defaultName,
              accountType: desiredType,
              balance: new Prisma.Decimal(0),
            },
          });
        }

        // ------------------------------------------------
        // 4. Create PaymentOut record
        // ------------------------------------------------

        const newPayment = await tx.paymentOut.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId: body.partyId,
            accountId: targetAccount.id,
            amount: amt,
            mode: body.mode,
            date: new Date(body.date),
            referenceNumber: body.referenceNumber || null,
            notes: body.notes || null,
          },

          include: {
            party: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },

            account: {
              select: {
                id: true,
                accountName: true,
              },
            },
          },
        });

        // ------------------------------------------------
        // 5. Update Supplier Payable Balance
        // ------------------------------------------------

        const curBal = new Prisma.Decimal(
          party.currentBalance || 0
        );

        const newBal = curBal.add(amt);

        await tx.party.update({
          where: {
            id: body.partyId,
          },
          data: {
            currentBalance: newBal,
          },
        });

        // ------------------------------------------------
        // 6. Decrease Cash/Bank Account Balance
        // ------------------------------------------------

        const curAccBal = new Prisma.Decimal(
          targetAccount.balance || 0
        );

        const newAccBal = curAccBal.sub(amt);

        await tx.account.update({
          where: {
            id: targetAccount.id,
          },
          data: {
            balance: newAccBal,
          },
        });

        // ------------------------------------------------
        // 7. Reduce unpaid purchase bills FIFO
        // ------------------------------------------------

        const unpaidBills = await tx.purchase.findMany({
          where: {
            businessId: request.tenant!.businessId,
            partyId: body.partyId,
            status: {
              in: ['UNPAID', 'PARTIAL'],
            },
            dueAmount: {
              gt: 0,
            },
          },

          orderBy: {
            date: 'asc',
          },
        });

        let remainingPayment = new Prisma.Decimal(amt);

        for (const bill of unpaidBills) {
          if (remainingPayment.lessThanOrEqualTo(0)) {
            break;
          }

          const billDue = new Prisma.Decimal(
            bill.dueAmount || 0
          );

          const reduction =
            remainingPayment.greaterThanOrEqualTo(billDue)
              ? billDue
              : remainingPayment;

          const newDue = billDue.sub(reduction);

          const newPaid = new Prisma.Decimal(
            bill.paidAmount || 0
          ).add(reduction);

          const newStatus = newDue.lessThanOrEqualTo(0)
            ? 'PAID'
            : 'PARTIAL';

          await tx.purchase.update({
            where: {
              id: bill.id,
            },

            data: {
              dueAmount: newDue,
              paidAmount: newPaid,
              status: newStatus as any,
            },
          });

          remainingPayment = remainingPayment.sub(
            reduction
          );
        }

        // ------------------------------------------------
        // 8. Create Transaction Entry
        // ------------------------------------------------

        await tx.transaction.create({
          data: {
            businessId: request.tenant!.businessId,
            accountId: targetAccount.id,
            category: TransactionCategory.PAYMENT_OUT,
            amount: amt,
            referenceId: newPayment.id,
            description:
              body.notes ||
              `Payment made to ${party.name}`,
            date: new Date(body.date),
          },
        });

        return newPayment;
      },

      // IMPORTANT:
      // Increase Prisma interactive transaction timeout
      // from 5 seconds to 15 seconds.
      {
        timeout: 15000,
      }
    );

    return reply.status(201).send({
      success: true,
      data: paymentOut,
    });
  });

  // ====================================================
  // GET PAYMENT OUT BY ID
  // ====================================================

  fastify.get('/out/:id', async (request, reply) => {
    const { id } = request.params as {
      id: string;
    };

    const payment = await request.db!.paymentOut.findFirst({
      where: {
        id,
        businessId: request.tenant!.businessId,
      },

      include: {
        party: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            currentBalance: true,
          },
        },

        account: {
          select: {
            id: true,
            accountName: true,
            accountType: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(
        'Payment Out record not found',
        404,
        'NOT_FOUND'
      );
    }

    return reply.send({
      success: true,
      data: payment,
    });
  });

  // ====================================================
  // VOID PAYMENT OUT
  // ====================================================

  fastify.post('/out/:id/void', async (request, reply) => {
    const { id } = request.params as {
      id: string;
    };

    const result = await request.db!.$transaction(
      async (tx) => {
        // ------------------------------------------------
        // 1. Find payment
        // ------------------------------------------------

        const payment = await tx.paymentOut.findFirst({
          where: {
            id,
            businessId: request.tenant!.businessId,
          },
        });

        if (!payment) {
          throw new AppError(
            'Payment Out record not found',
            404,
            'NOT_FOUND'
          );
        }

        if (payment.status === 'VOIDED') {
          throw new AppError(
            'Payment is already voided',
            400,
            'BAD_REQUEST'
          );
        }

        const amt = new Prisma.Decimal(payment.amount);

        // ------------------------------------------------
        // 2. Revert Supplier Payable Balance
        // ------------------------------------------------

        await tx.party.update({
          where: {
            id: payment.partyId,
          },

          data: {
            currentBalance: {
              decrement: amt,
            },
          },
        });

        // ------------------------------------------------
        // 3. Restore Account Balance
        // ------------------------------------------------

        await updateAccountBalance(
          tx as any,
          payment.accountId,
          amt,
          'ADD'
        );

        // ------------------------------------------------
        // 4. Remove transaction record
        // ------------------------------------------------

        await tx.transaction.deleteMany({
          where: {
            referenceId: id,
          },
        });

        // ------------------------------------------------
        // 5. Mark payment as VOIDED
        // ------------------------------------------------

        const updatedPayment = await tx.paymentOut.update({
          where: {
            id,
          },

          data: {
            status: 'VOIDED',
          },
        });

        return updatedPayment;
      },

      // IMPORTANT
      {
        timeout: 15000,
      }
    );

    return reply.send({
      success: true,
      data: result,
      message: 'Payment Out record voided successfully',
    });
  });
}
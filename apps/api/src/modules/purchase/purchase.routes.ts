import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { createPurchaseSchema, createPurchaseReturnSchema } from '@bizmanage/validation';
import { InvoiceStatus, StockMovementType, TransactionCategory, PaymentMode, AccountType, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';
import {
  calculateInvoiceTotals,
  updatePartyBalance,
  updateAccountBalance,
  updateStock,
} from '../../services/accounting.service.js';

export async function purchaseRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // GET PURCHASES SUMMARY
  // ----------------------------------------------------
  fastify.get('/summary', async (request, reply) => {
    const purchases = await request.db!.purchase.findMany({
      select: {
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        status: true,
      },
    });

    let totalPurchaseAmount = new Prisma.Decimal(0);
    let totalPaid = new Prisma.Decimal(0);
    let totalDue = new Prisma.Decimal(0);
    let unpaidCount = 0;

    for (const p of purchases) {
      totalPurchaseAmount = totalPurchaseAmount.add(p.totalAmount || 0);
      totalPaid = totalPaid.add(p.paidAmount || 0);
      totalDue = totalDue.add(p.dueAmount || 0);

      if (p.status === InvoiceStatus.UNPAID || p.status === InvoiceStatus.PARTIAL) {
        unpaidCount++;
      }
    }

    return reply.send({
      success: true,
      data: {
        totalPurchasesCount: purchases.length,
        totalPurchaseAmount: totalPurchaseAmount.toNumber(),
        totalPaid: totalPaid.toNumber(),
        totalDue: totalDue.toNumber(),
        unpaidCount,
      },
    });
  });

  // ----------------------------------------------------
  // LIST PURCHASES WITH SEARCH & FILTERS
  // ----------------------------------------------------
  fastify.get('/', async (request, reply) => {
    const { search, partyId, status, page = '1', limit = '50' } = request.query as {
      search?: string;
      partyId?: string;
      status?: InvoiceStatus;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.PurchaseWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (partyId) {
      whereClause.partyId = partyId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { billNumber: { contains: q, mode: 'insensitive' } },
        { party: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [purchases, total] = await Promise.all([
      request.db!.purchase.findMany({
        where: whereClause,
        include: {
          party: {
            select: { id: true, name: true, phone: true },
          },
          items: {
            include: {
              item: { select: { id: true, name: true, code: true, unit: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      request.db!.purchase.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: purchases,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // ----------------------------------------------------
  // GET PURCHASE BILL DETAILS
  // ----------------------------------------------------
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const purchase = await request.db!.purchase.findUnique({
      where: { id },
      include: {
        party: true,
        items: {
          include: {
            item: true,
          },
        },
        returns: {
          include: {
            items: { include: { item: true } },
          },
        },
      },
    });

    if (!purchase) {
      throw new AppError('Purchase record not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: purchase,
    });
  });

  // ----------------------------------------------------
  // CREATE NEW PURCHASE BILL (Transaction-Safe)
  // ----------------------------------------------------
  fastify.post('/', async (request, reply) => {
    const body = createPurchaseSchema.parse(request.body);

    const newPurchase = await request.db!.$transaction(async (tx) => {
      // 1. Settings prefix & Tax Rate
      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.purchasePrefix || 'PUR-';
      const vatRate = settings?.taxRate || 13;

      // 2. Generate unique Bill Number
      let billNumber = body.billNumber;
      if (!billNumber) {
        let count = await tx.purchase.count({
          where: { businessId: request.tenant!.businessId },
        });
        let candidate = `${prefix}${String(count + 1).padStart(5, '0')}`;
        let exists = await tx.purchase.findFirst({
          where: { businessId: request.tenant!.businessId, billNumber: candidate },
        });
        while (exists) {
          count++;
          candidate = `${prefix}${String(count + 1).padStart(5, '0')}`;
          exists = await tx.purchase.findFirst({
            where: { businessId: request.tenant!.businessId, billNumber: candidate },
          });
        }
        billNumber = candidate;
      }

      // 3. Centralized Math Engine
      const totals = calculateInvoiceTotals(
        body.items.map(i => ({ ...i, discountPercent: i.discountPercent })),
        body.isVatBill,
        0, // global discount percent if we add it to schema later
        vatRate
      );

      const paidAmount = new Prisma.Decimal(body.paidAmount || 0);
      const rawDue = totals.totalAmount.sub(paidAmount);
      const dueAmount = rawDue.isNegative() ? new Prisma.Decimal(0) : rawDue;

      let status: InvoiceStatus = InvoiceStatus.UNPAID;
      if (dueAmount.lessThanOrEqualTo(0)) {
        status = InvoiceStatus.PAID;
      } else if (paidAmount.greaterThan(0)) {
        status = InvoiceStatus.PARTIAL;
      }

      const preparedItems = body.items.map((line, idx) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
        discount: totals.items[idx].discountAmount,
        taxAmount: totals.items[idx].taxAmount,
        total: totals.items[idx].total,
      }));

      // 4. Create Purchase Record
      const purchase = await tx.purchase.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: body.partyId,
          billNumber,
          date: new Date(body.date),
          status,
          isVatBill: body.isVatBill,
          subTotal: totals.subTotal,
          taxAmount: totals.taxAmount,
          discount: totals.discount,
          totalAmount: totals.totalAmount,
          paidAmount,
          dueAmount,
          notes: body.notes || null,
          items: {
            create: preparedItems,
          },
        },
        include: {
          party: true,
          items: { include: { item: true } },
        },
      });

      // 5. Update Inventory
      for (const line of body.items) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (item && item.type === 'PRODUCT') {
          await updateStock(tx as any, line.itemId, line.quantity, 'ADD');
          await tx.stockMovement.create({
            data: {
              businessId: request.tenant!.businessId,
              itemId: line.itemId,
              type: StockMovementType.PURCHASE,
              quantity: new Prisma.Decimal(line.quantity),
              reference: `Purchase Bill ${billNumber}`,
            },
          });
        }
      }

      // 6. Update Supplier Balance (Increase Payable)
      await updatePartyBalance(tx as any, body.partyId, totals.totalAmount, 'ADD_PAYABLE');

      // 7. Handle Payment Out
      if (paidAmount.greaterThan(0)) {
        await updatePartyBalance(tx as any, body.partyId, paidAmount, 'REDUCE_PAYABLE');

        let targetAccount = body.accountId
          ? await tx.account.findUnique({ where: { id: body.accountId } })
          : await tx.account.findFirst({ where: { businessId: request.tenant!.businessId } });

        if (!targetAccount) {
          targetAccount = await tx.account.create({
            data: {
              businessId: request.tenant!.businessId,
              accountName: 'Main Account',
              accountType: 'CASH',
            },
          });
        }

        const newAccBal = new Prisma.Decimal(targetAccount.balance || 0).sub(paidAmount);
        if (newAccBal.lessThan(0)) {
          throw new AppError('Insufficient balance in the selected account. Please add funds or change payment method.', 400, 'VALIDATION_ERROR');
        }

        await updateAccountBalance(tx as any, targetAccount.id, paidAmount, 'REDUCE');

        await tx.paymentOut.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId: body.partyId,
            accountId: targetAccount.id,
            amount: paidAmount,
            mode: body.paymentMode,
            date: new Date(body.date),
            referenceNumber: billNumber,
            notes: `Payment for Purchase Bill ${billNumber}`,
          },
        });

        await tx.transaction.create({
          data: {
            businessId: request.tenant!.businessId,
            accountId: targetAccount.id,
            category: TransactionCategory.PURCHASE,
            amount: paidAmount,
            referenceId: purchase.id,
            description: `Payment for Purchase Bill ${billNumber}`,
            date: new Date(body.date),
          },
        });
      }

      return purchase;
    });

    return reply.status(201).send({
      success: true,
      data: newPurchase,
    });
  });

  // ----------------------------------------------------
  // RECORD PAYMENT DIRECTLY FOR A PURCHASE BILL
  // ----------------------------------------------------
  fastify.post('/:id/pay', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amount, paymentMode = PaymentMode.CASH, accountId, notes } = request.body as {
      amount?: number;
      paymentMode?: PaymentMode;
      accountId?: string;
      notes?: string;
    };

    const updatedPurchase = await request.db!.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id, businessId: request.tenant!.businessId },
        include: { party: true },
      });

      if (!purchase) {
        throw new AppError('Purchase bill not found', 404, 'NOT_FOUND');
      }

      const curDue = new Prisma.Decimal(purchase.dueAmount || 0);
      if (curDue.lessThanOrEqualTo(0)) {
        throw new AppError('This bill is already fully paid', 400, 'ALREADY_PAID');
      }

      const payAmt = amount && amount > 0 ? new Prisma.Decimal(amount) : curDue;
      const actualPay = payAmt.greaterThan(curDue) ? curDue : payAmt;

      const newDue = curDue.sub(actualPay);
      const newPaid = new Prisma.Decimal(purchase.paidAmount || 0).add(actualPay);
      const newStatus = newDue.lessThanOrEqualTo(0) ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      // Update purchase
      const updated = await tx.purchase.update({
        where: { id },
        data: {
          dueAmount: newDue,
          paidAmount: newPaid,
          status: newStatus,
        },
      });

      // Update supplier party balance (increase towards 0)
      if (purchase.partyId) {
        const party = await tx.party.findUnique({ where: { id: purchase.partyId } });
        if (party) {
          const curBal = new Prisma.Decimal(party.currentBalance || 0);
          const newBal = curBal.add(actualPay);
          await tx.party.update({
            where: { id: purchase.partyId },
            data: { currentBalance: newBal },
          });
        }
      }

      // Update cash/bank account balance (decrease)
      const desiredType =
        paymentMode === PaymentMode.BANK || paymentMode === PaymentMode.CHEQUE
          ? AccountType.BANK
          : paymentMode === PaymentMode.ONLINE
          ? AccountType.MOBILE_WALLET
          : AccountType.CASH;

      let targetAccount = accountId
        ? await tx.account.findUnique({ where: { id: accountId } })
        : await tx.account.findFirst({
            where: { businessId: request.tenant!.businessId, accountType: desiredType },
          });

      if (!targetAccount) {
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

      const curAccBal = new Prisma.Decimal(targetAccount.balance || 0);
      const newAccBal = curAccBal.sub(actualPay);

      if (newAccBal.lessThan(0)) {
        throw new AppError('Insufficient balance in the selected account. Please add funds or change payment method.', 400, 'VALIDATION_ERROR');
      }

      await tx.account.update({
        where: { id: targetAccount.id },
        data: { balance: newAccBal },
      });

      // Record PaymentOut entry
      if (purchase.partyId) {
        await tx.paymentOut.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId: purchase.partyId,
            accountId: targetAccount.id,
            amount: actualPay,
            mode: paymentMode,
            date: new Date(),
            referenceNumber: purchase.billNumber,
            notes: notes || `Direct payment for Purchase Bill ${purchase.billNumber}`,
          },
        });
      }

      // Record Transaction entry
      await tx.transaction.create({
        data: {
          businessId: request.tenant!.businessId,
          accountId: targetAccount.id,
          category: TransactionCategory.PURCHASE,
          amount: actualPay,
          referenceId: purchase.id,
          description: notes || `Direct payment for Purchase Bill ${purchase.billNumber}`,
          date: new Date(),
        },
      });

      return updated;
    });

    return reply.send({ success: true, data: updatedPurchase });
  });

  // ----------------------------------------------------
  // LIST PURCHASE RETURNS (Debit Notes)
  // ----------------------------------------------------
  fastify.get('/returns/list', async (request, reply) => {
    const returns = await request.db!.purchaseReturn.findMany({
      include: {
        party: { select: { id: true, name: true, phone: true } },
        items: { include: { item: { select: { id: true, name: true, unit: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    return reply.send({
      success: true,
      data: returns,
    });
  });

  // GET SINGLE PURCHASE RETURN
  fastify.get('/returns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const purchaseReturn = await request.db!.purchaseReturn.findFirst({
      where: { id, businessId: request.tenant!.businessId },
      include: {
        party: true,
        items: { include: { item: true } },
      },
    });

    if (!purchaseReturn) {
      throw new AppError('Purchase Return (Debit Note) not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: purchaseReturn,
    });
  });

  // ----------------------------------------------------
  // CREATE PURCHASE RETURN (Debit Note Transaction-Safe)
  // ----------------------------------------------------
  fastify.post('/returns', async (request, reply) => {
    const body = createPurchaseReturnSchema.parse(request.body);

    const purchaseReturn = await request.db!.$transaction(async (tx) => {
      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.purchaseReturnPrefix || 'DN-';
      const vatRate = settings?.enableTax ? Number(settings.taxRate) : 0;

      let returnNumber = body.returnNumber;
      if (!returnNumber) {
        const count = await tx.purchaseReturn.count({
          where: { businessId: request.tenant!.businessId },
        });
        returnNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;
      }

      // Check if it's returning against a specific purchase
      let isVatBill = false;
      if (body.purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: body.purchaseId } });
        if (purchase) {
          isVatBill = purchase.isVatBill;
        }
      }

      // 1. Calculate totals using centralized engine
      const totals = calculateInvoiceTotals(body.items, isVatBill, 0, vatRate);

      // 2. Prepare items
      const preparedItems = body.items.map((line, index) => {
        const lineTotals = totals.items[index]!;
        return {
          itemId: line.itemId,
          quantity: new Prisma.Decimal(line.quantity),
          unitPrice: new Prisma.Decimal(line.unitPrice),
          discountPercent: new Prisma.Decimal(line.discountPercent || 0),
          discount: lineTotals.discountAmount,
          taxAmount: lineTotals.taxAmount,
          total: lineTotals.total,
        };
      });

      // 3. Create PurchaseReturn
      const newReturn = await tx.purchaseReturn.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: body.partyId,
          purchaseId: body.purchaseId || null,
          returnNumber,
          date: new Date(body.date),
          subTotal: totals.subTotal,
          taxAmount: totals.taxAmount,
          discountPercent: 0,
          discount: totals.discount,
          totalAmount: totals.totalAmount,
          notes: body.notes || null,
          items: { create: preparedItems },
        },
        include: {
          party: true,
          items: { include: { item: true } },
        },
      });

      // 4. Update Original Purchase and Quantities
      if (body.purchaseId) {
        await tx.purchase.update({
          where: { id: body.purchaseId },
          data: { status: 'RETURNED' },
        });

        for (const line of body.items) {
          const purchaseItem = await tx.purchaseItem.findFirst({
            where: { purchaseId: body.purchaseId, itemId: line.itemId },
          });
          if (purchaseItem) {
            const currentRet = new Prisma.Decimal(purchaseItem.returnedQuantity || 0);
            const reqRet = new Prisma.Decimal(line.quantity);
            const maxAllowed = new Prisma.Decimal(purchaseItem.quantity);

            if (currentRet.add(reqRet).greaterThan(maxAllowed)) {
              throw new AppError(`Cannot return more than originally purchased. Allowed remaining: ${maxAllowed.sub(currentRet).toNumber()}`, 400);
            }

            await tx.purchaseItem.update({
              where: { id: purchaseItem.id },
              data: { returnedQuantity: currentRet.add(reqRet) },
            });
          }
        }
      }

      // 5. Decrease Stock atomically
      for (const line of body.items) {
        await updateStock(tx as any, line.itemId, line.quantity, 'REDUCE');
        await tx.stockMovement.create({
          data: {
            businessId: request.tenant!.businessId,
            itemId: line.itemId,
            type: StockMovementType.PURCHASE_RETURN,
            quantity: new Prisma.Decimal(line.quantity).negated(),
            reference: `Debit Note ${returnNumber}`,
          },
        });
      }

      // 6. Handle Financials
      const refundAmt = new Prisma.Decimal(body.refundAmount || 0);
      const debitToBalance = totals.totalAmount.sub(refundAmt); // Amount not refunded immediately

      if (refundAmt.greaterThan(0)) {
        let targetAccount = body.accountId
          ? await tx.account.findUnique({ where: { id: body.accountId } })
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

        // Refund means money in (supplier gives us money back)
        await updateAccountBalance(tx as any, targetAccount.id, refundAmt.toNumber(), 'ADD');

        await tx.paymentIn.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId: body.partyId,
            accountId: targetAccount.id,
            amount: refundAmt,
            mode: body.paymentMode || PaymentMode.CASH,
            date: new Date(body.date),
            referenceNumber: returnNumber,
            notes: `Cash refund for Debit Note ${returnNumber}`,
          },
        });

        await tx.transaction.create({
          data: {
            businessId: request.tenant!.businessId,
            accountId: targetAccount.id,
            category: TransactionCategory.PURCHASE_RETURN,
            amount: refundAmt,
            referenceId: newReturn.id,
            description: `Refund for Debit Note ${returnNumber}`,
            date: new Date(body.date),
          },
        });
      }

      // Adjust supplier balance (Debit note reduces what we owe them)
      // For a supplier, negative balance means payable. Reducing payable means ADD.
      if (!debitToBalance.isZero()) {
        await updatePartyBalance(tx as any, body.partyId, debitToBalance.toNumber(), 'REDUCE_PAYABLE');
      }

      return newReturn;
    });

    return reply.status(201).send({
      success: true,
      data: purchaseReturn,
    });
  });
}

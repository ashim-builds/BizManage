import { createAuditLog } from '../../services/audit-log.service.js';
import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { createPurchaseSchema, createPurchaseReturnSchema } from '@bizmanage/validation';
import { InvoiceStatus, StockMovementType, TransactionCategory, PaymentMode, AccountType, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';

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

    const purchase = await request.db!.purchase.findFirst({
      where: { id, businessId: request.tenant!.businessId },
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
      // 1. Settings prefix
      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.purchasePrefix || 'PUR-';

      // 2. Generate unique Bill Number
      let billNumber = body.billNumber;
      if (!billNumber) {
        const count = await tx.purchase.count({
          where: { businessId: request.tenant!.businessId },
        });
        billNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;
      }

      // 3. Line items math
      let subTotal = new Prisma.Decimal(0);
      let totalTax = new Prisma.Decimal(0);
      let totalDiscount = new Prisma.Decimal(0);
      const preparedItems = [];

      for (const line of body.items) {
        const qty = new Prisma.Decimal(line.quantity);
        const unitPrice = new Prisma.Decimal(line.unitPrice);
        const disc = new Prisma.Decimal(line.discount || 0);
        const tax = new Prisma.Decimal(line.taxAmount || 0);

        const itemSubtotal = qty.mul(unitPrice);
        const itemTotal = itemSubtotal.sub(disc).add(tax);

        subTotal = subTotal.add(itemSubtotal);
        totalDiscount = totalDiscount.add(disc);
        totalTax = totalTax.add(tax);

        preparedItems.push({
          itemId: line.itemId,
          quantity: qty,
          unitPrice,
          discount: disc,
          taxAmount: tax,
          total: itemTotal,
        });
      }

      const totalAmount = subTotal.sub(totalDiscount).add(totalTax);
      const paidAmount = new Prisma.Decimal(body.paidAmount || 0);
      const rawDue = totalAmount.sub(paidAmount);
      const dueAmount = rawDue.isNegative() ? new Prisma.Decimal(0) : rawDue;

      let status: InvoiceStatus = InvoiceStatus.UNPAID;
      if (dueAmount.lessThanOrEqualTo(0)) {
        status = InvoiceStatus.PAID;
      } else if (paidAmount.greaterThan(0)) {
        status = InvoiceStatus.PARTIAL;
      }

      // 4. Create Purchase Record
      const purchase = await tx.purchase.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: body.partyId,
          billNumber,
          date: new Date(body.date),
          status,
          subTotal,
          taxAmount: totalTax,
          discount: totalDiscount,
          totalAmount,
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

      // 5. Update Inventory (Increase Stock & Log StockMovement)
      for (const line of body.items) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (item && item.type === 'PRODUCT') {
          const curStock = new Prisma.Decimal(item.currentStock || 0);
          const qtyDecimal = new Prisma.Decimal(line.quantity);
          const newStock = curStock.add(qtyDecimal);

          await tx.item.update({
            where: { id: line.itemId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              businessId: request.tenant!.businessId,
              itemId: line.itemId,
              type: StockMovementType.PURCHASE,
              quantity: qtyDecimal,
              reference: `Purchase Bill ${billNumber}`,
            },
          });
        }
      }

      // 6. Update Supplier Balance (Increase Payable if dueAmount > 0)
      if (dueAmount.greaterThan(0)) {
        const party = await tx.party.findUnique({ where: { id: body.partyId } });
        if (party) {
          const curBal = new Prisma.Decimal(party.currentBalance || 0);
          const newBal = curBal.sub(dueAmount); // Negative balance = payable to supplier
          await tx.party.update({
            where: { id: body.partyId },
            data: { currentBalance: newBal },
          });
        }
      }

      // 7. Payment Out & Cash/Bank Account Balance Update
      if (paidAmount.greaterThan(0)) {
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

        const curAccBal = new Prisma.Decimal(targetAccount.balance || 0);
        const newAccBal = curAccBal.sub(paidAmount);
        await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: newAccBal },
        });

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

    createAuditLog({
      request,
      action: 'CREATE_PURCHASE',
      module: 'PURCHASE',
      recordId: newPurchase.id,
      newValue: { billNumber: newPurchase.billNumber, totalAmount: Number(newPurchase.totalAmount) },
    }).catch(() => {});

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
      const purchase = await tx.purchase.findFirst({
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

      if (amount && amount <= 0) {
        throw new AppError('Payment amount must be greater than 0', 400, 'INVALID_AMOUNT');
      }

      if (amount && new Prisma.Decimal(amount).greaterThan(curDue)) {
        throw new AppError(
          `Payment amount (Rs. ${amount}) exceeds remaining purchase bill balance due (Rs. ${curDue.toNumber()})`,
          400,
          'OVER_PAYMENT'
        );
      }

      const payAmt = amount && amount > 0 ? new Prisma.Decimal(amount) : curDue;
      const actualPay = payAmt;

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
        ? await tx.account.findFirst({ where: { id: accountId, businessId: request.tenant!.businessId } })
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

    createAuditLog({
      request,
      action: 'PAY_PURCHASE',
      module: 'PURCHASE',
      recordId: updatedPurchase.id,
      newValue: { billNumber: updatedPurchase.billNumber, paidAmount: Number(updatedPurchase.paidAmount), dueAmount: Number(updatedPurchase.dueAmount) },
    }).catch(() => {});

    return reply.send({ success: true, data: updatedPurchase });
  });

  // ----------------------------------------------------
  // LIST PURCHASE RETURNS (Debit Notes)
  // ----------------------------------------------------
  fastify.get('/returns/list', async (request, reply) => {
    const returns = await request.db!.purchaseReturn.findMany({
      where: { businessId: request.tenant!.businessId },
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

  // ----------------------------------------------------
  // CREATE PURCHASE RETURN (Debit Note Transaction-Safe)
  // ----------------------------------------------------
  fastify.post('/returns', async (request, reply) => {
    const body = createPurchaseReturnSchema.parse(request.body);

    const purchaseReturn = await request.db!.$transaction(async (tx) => {
      // 0. Over-Return Validation against Original Purchase Bill (if linked)
      if (body.purchaseId) {
        const originalPurchase = await tx.purchase.findFirst({
          where: { id: body.purchaseId, businessId: request.tenant!.businessId },
          include: { items: true },
        });

        if (!originalPurchase) {
          throw new AppError('Original purchase bill not found for this business tenant', 404, 'NOT_FOUND');
        }

        const previousReturns = await tx.purchaseReturn.findMany({
          where: { purchaseId: body.purchaseId, businessId: request.tenant!.businessId },
          include: { items: true },
        });

        const returnedMap = new Map<string, number>();
        for (const prevReturn of previousReturns) {
          for (const prevItem of prevReturn.items) {
            returnedMap.set(prevItem.itemId, (returnedMap.get(prevItem.itemId) || 0) + Number(prevItem.quantity));
          }
        }

        for (const line of body.items) {
          if (line.quantity <= 0) {
            throw new AppError('Return quantity must be greater than 0', 400, 'INVALID_QUANTITY');
          }
          const originalLine = originalPurchase.items.find((i) => i.itemId === line.itemId);
          if (!originalLine) {
            throw new AppError(
              `Item (ID: ${line.itemId}) was not included in original purchase bill #${originalPurchase.billNumber}`,
              400,
              'INVALID_RETURN_ITEM'
            );
          }
          const alreadyReturned = returnedMap.get(line.itemId) || 0;
          const maxReturnable = Number(originalLine.quantity) - alreadyReturned;
          if (line.quantity > maxReturnable) {
            throw new AppError(
              `Over-return error: Cannot return ${line.quantity} units for item. Only ${maxReturnable} units remain returnable on Bill #${originalPurchase.billNumber}.`,
              400,
              'OVER_RETURN'
            );
          }
        }
      }

      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.purchaseReturnPrefix || 'DN-';

      let returnNumber = body.returnNumber;
      if (!returnNumber) {
        const count = await tx.purchaseReturn.count({
          where: { businessId: request.tenant!.businessId },
        });
        returnNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;
      }

      let subTotal = new Prisma.Decimal(0);
      let totalTax = new Prisma.Decimal(0);
      let totalDiscount = new Prisma.Decimal(0);
      const preparedItems = [];

      for (const line of body.items) {
        const qty = new Prisma.Decimal(line.quantity);
        const unitPrice = new Prisma.Decimal(line.unitPrice);
        const disc = new Prisma.Decimal(line.discount || 0);
        const tax = new Prisma.Decimal(line.taxAmount || 0);

        const itemSubtotal = qty.mul(unitPrice);
        const itemTotal = itemSubtotal.sub(disc).add(tax);

        subTotal = subTotal.add(itemSubtotal);
        totalDiscount = totalDiscount.add(disc);
        totalTax = totalTax.add(tax);

        preparedItems.push({
          itemId: line.itemId,
          quantity: qty,
          unitPrice,
          discount: disc,
          taxAmount: tax,
          total: itemTotal,
        });
      }

      const totalAmount = subTotal.sub(totalDiscount).add(totalTax);

      const newReturn = await tx.purchaseReturn.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: body.partyId,
          purchaseId: body.purchaseId || null,
          returnNumber,
          date: new Date(body.date),
          subTotal,
          taxAmount: totalTax,
          discount: totalDiscount,
          totalAmount,
          notes: body.notes || null,
          items: { create: preparedItems },
        },
        include: {
          party: true,
          items: { include: { item: true } },
        },
      });

      // 1. Decrease Stock & Log StockMovement (PURCHASE_RETURN)
      for (const line of body.items) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (item && item.type === 'PRODUCT') {
          const curStock = new Prisma.Decimal(item.currentStock || 0);
          const qtyDecimal = new Prisma.Decimal(line.quantity);
          const newStock = curStock.sub(qtyDecimal);

          await tx.item.update({
            where: { id: line.itemId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              businessId: request.tenant!.businessId,
              itemId: line.itemId,
              type: StockMovementType.PURCHASE_RETURN,
              quantity: qtyDecimal.negated(),
              reference: `Debit Note ${returnNumber}`,
            },
          });
        }
      }

      // 2. Immediate Cash/Bank Refund & Supplier Payable Adjustment
      const refundAmt = new Prisma.Decimal(body.refundAmount || 0);
      const debitToBalance = totalAmount.sub(refundAmt);

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

        const curAccBal = new Prisma.Decimal(targetAccount.balance || 0);
        const newAccBal = curAccBal.add(refundAmt);
        await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: newAccBal },
        });

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
            description: `Cash refund for Debit Note ${returnNumber}`,
            date: new Date(body.date),
          },
        });
      }

      if (!debitToBalance.isZero()) {
        const party = await tx.party.findUnique({ where: { id: body.partyId } });
        if (party) {
          const curBal = new Prisma.Decimal(party.currentBalance || 0);
          const newBal = curBal.add(debitToBalance);
          await tx.party.update({
            where: { id: body.partyId },
            data: { currentBalance: newBal },
          });
        }
      }

      return newReturn;
    });

    createAuditLog({
      request,
      action: 'CREATE_PURCHASE_RETURN',
      module: 'PURCHASE',
      recordId: purchaseReturn.id,
      newValue: { returnNumber: purchaseReturn.returnNumber, totalAmount: Number(purchaseReturn.totalAmount) },
    }).catch(() => {});

    return reply.status(201).send({
      success: true,
      data: purchaseReturn,
    });
  });
}

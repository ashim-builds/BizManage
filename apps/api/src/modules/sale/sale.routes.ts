import { createAuditLog } from '../../services/audit-log.service.js';
import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import {
  createSaleSchema,
  createSaleReturnSchema,
  createQuotationSchema,
} from '@bizmanage/validation';
import {
  InvoiceStatus,
  QuotationStatus,
  StockMovementType,
  TransactionCategory,
  PaymentMode,
  AccountType,
  Prisma,
} from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';
import { emailService } from '../../services/email/email.service.js';

export async function saleRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // GET SALES SUMMARY
  // ----------------------------------------------------
  fastify.get('/summary', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    const [agg, unpaidCount, totalCount] = await Promise.all([
      request.db!.sale.aggregate({
        where: { businessId },
        _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
      }),
      request.db!.sale.count({
        where: {
          businessId,
          status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
        },
      }),
      request.db!.sale.count({ where: { businessId } }),
    ]);

    return reply.send({
      success: true,
      data: {
        totalSalesCount: totalCount,
        totalSalesAmount: Number(agg._sum.totalAmount || 0),
        totalCollected: Number(agg._sum.paidAmount || 0),
        totalReceivables: Number(agg._sum.dueAmount || 0),
        unpaidCount,
      },
    });
  });

  // ----------------------------------------------------
  // LIST SALES INVOICES WITH SEARCH & FILTERS
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

    const whereClause: Prisma.SaleWhereInput = {
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
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { party: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [sales, total] = await Promise.all([
      request.db!.sale.findMany({
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
      request.db!.sale.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: sales,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // ----------------------------------------------------
  // GET SALE INVOICE DETAILS
  // ----------------------------------------------------
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const sale = await request.db!.sale.findFirst({
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

    if (!sale) {
      throw new AppError('Sale invoice not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: sale,
    });
  });

  // ----------------------------------------------------
  // CREATE NEW SALE INVOICE (Transaction-Safe with Stock Control)
  // ----------------------------------------------------
  fastify.post('/', async (request, reply) => {
    const body = createSaleSchema.parse(request.body);

    const newSale = await request.db!.$transaction(async (tx) => {
      // 1. Stock Availability Check for all requested items
      for (const line of body.items) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item) {
          throw new AppError(`Item not found (ID: ${line.itemId})`, 404, 'NOT_FOUND');
        }

        if (item.type === 'PRODUCT') {
          const curStock = new Prisma.Decimal(item.currentStock || 0);
          const reqQty = new Prisma.Decimal(line.quantity);
          if (curStock.lessThan(reqQty)) {
            throw new AppError(
              `Insufficient stock for "${item.name}". Available: ${curStock} ${item.unit}, Requested: ${reqQty} ${item.unit}.`,
              400,
              'INSUFFICIENT_STOCK'
            );
          }
        }
      }

      // 2. Settings prefix
      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.invoicePrefix || 'INV-';

      // 3. Generate unique Invoice Number
      let invoiceNumber = body.invoiceNumber;
      if (!invoiceNumber) {
        const count = await tx.sale.count({
          where: { businessId: request.tenant!.businessId },
        });
        invoiceNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;
      }

      // 4. Line items math
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

      let partyId = body.partyId;
      if (!partyId || partyId.trim() === '' || partyId === 'CASH') {
        let cashParty = await tx.party.findFirst({
          where: { businessId: request.tenant!.businessId, name: 'Cash Customer', type: 'CUSTOMER' },
        });
        if (!cashParty) {
          cashParty = await tx.party.create({
            data: {
              businessId: request.tenant!.businessId,
              name: 'Cash Customer',
              type: 'CUSTOMER',
              phone: 'N/A',
            },
          });
        }
        partyId = cashParty.id;
      }

      // 5. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId,
          invoiceNumber,
          date: new Date(body.date),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
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

      // 6. Update Inventory (Decrease Stock & Log StockMovement)
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
              type: StockMovementType.SALE,
              quantity: qtyDecimal.negated(),
              reference: `Sale Invoice ${invoiceNumber}`,
            },
          });
        }
      }

      // 7. Update Customer Balance (Increase Receivable if dueAmount > 0)
      if (dueAmount.greaterThan(0)) {
        const party = await tx.party.findUnique({ where: { id: body.partyId ?? undefined } });
        if (party) {
          const curBal = new Prisma.Decimal(party.currentBalance || 0);
          const newBal = curBal.add(dueAmount); // Positive balance = customer owes business
          await tx.party.update({
            where: { id: body.partyId ?? undefined },
            data: { currentBalance: newBal },
          });
        }
      }

      // 8. Payment In & Cash/Bank Account Balance Update
      if (paidAmount.greaterThan(0)) {
        const desiredType =
          body.paymentMode === PaymentMode.BANK || body.paymentMode === PaymentMode.CHEQUE
            ? AccountType.BANK
            : body.paymentMode === PaymentMode.ONLINE
            ? AccountType.MOBILE_WALLET
            : AccountType.CASH;

        let targetAccount = body.accountId
          ? await tx.account.findUnique({ where: { id: body.accountId } })
          : await tx.account.findFirst({
              where: { businessId: request.tenant!.businessId, accountType: desiredType },
            });

        if (!targetAccount || (body.paymentMode !== PaymentMode.CASH && targetAccount.accountType === AccountType.CASH && !body.accountId)) {
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
        const newAccBal = curAccBal.add(paidAmount);
        await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: newAccBal },
        });

        if (body.partyId) {
          await tx.paymentIn.create({
            data: {
              businessId: request.tenant!.businessId,
              partyId: body.partyId,
              accountId: targetAccount.id,
              amount: paidAmount,
              mode: body.paymentMode,
              date: new Date(body.date),
              referenceNumber: invoiceNumber,
              notes: `Payment for Sale Invoice ${invoiceNumber}`,
            },
          });
        }

        await tx.transaction.create({
          data: {
            businessId: request.tenant!.businessId,
            accountId: targetAccount.id,
            category: TransactionCategory.SALE,
            amount: paidAmount,
            referenceId: sale.id,
            description: `Payment for Sale Invoice ${invoiceNumber}`,
            date: new Date(body.date),
          },
        });
      }

      return sale;
    });

    createAuditLog({
      request,
      action: 'CREATE_SALE',
      module: 'SALE',
      recordId: newSale.id,
      newValue: { invoiceNumber: newSale.invoiceNumber, totalAmount: Number(newSale.totalAmount) },
    }).catch(() => {});

    if (newSale.party?.email) {
      const biz = await request.db!.business.findUnique({ where: { id: request.tenant!.businessId } });
      emailService.sendInvoiceNotification(
        newSale.party.email,
        newSale.party.name,
        newSale.invoiceNumber,
        Number(newSale.totalAmount),
        new Date(newSale.date).toISOString().split('T')[0]!,
        biz?.name || 'BizManage'
      ).catch(() => {});
    }

    return reply.status(201).send({
      success: true,
      data: newSale,
    });
  });

  // ----------------------------------------------------
  // RECORD PAYMENT DIRECTLY FOR A SALE INVOICE
  // ----------------------------------------------------
  fastify.post('/:id/pay', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amount, paymentMode = PaymentMode.CASH, accountId, notes } = request.body as {
      amount?: number;
      paymentMode?: PaymentMode;
      accountId?: string;
      notes?: string;
    };

    const updatedSale = await request.db!.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id, businessId: request.tenant!.businessId },
        include: { party: true },
      });

      if (!sale) {
        throw new AppError('Sale invoice not found', 404, 'NOT_FOUND');
      }

      const curDue = new Prisma.Decimal(sale.dueAmount || 0);
      if (curDue.lessThanOrEqualTo(0)) {
        throw new AppError('This invoice is already fully paid', 400, 'ALREADY_PAID');
      }

      if (amount && amount <= 0) {
        throw new AppError('Payment amount must be greater than 0', 400, 'INVALID_AMOUNT');
      }

      if (amount && new Prisma.Decimal(amount).greaterThan(curDue)) {
        throw new AppError(
          `Payment amount (Rs. ${amount}) exceeds remaining invoice balance due (Rs. ${curDue.toNumber()})`,
          400,
          'OVER_PAYMENT'
        );
      }

      const payAmt = amount && amount > 0 ? new Prisma.Decimal(amount) : curDue;
      const actualPay = payAmt;

      const newDue = curDue.sub(actualPay);
      const newPaid = new Prisma.Decimal(sale.paidAmount || 0).add(actualPay);
      const newStatus = newDue.lessThanOrEqualTo(0) ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      // Update sale
      const updated = await tx.sale.update({
        where: { id },
        data: {
          dueAmount: newDue,
          paidAmount: newPaid,
          status: newStatus,
        },
      });

      // Update customer party balance
      if (sale.partyId) {
        const party = await tx.party.findUnique({ where: { id: sale.partyId } });
        if (party) {
          const curBal = new Prisma.Decimal(party.currentBalance || 0);
          const newBal = curBal.sub(actualPay);
          await tx.party.update({
            where: { id: sale.partyId },
            data: { currentBalance: newBal },
          });
        }
      }

      // Update cash/bank account balance
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
      const newAccBal = curAccBal.add(actualPay);
      await tx.account.update({
        where: { id: targetAccount.id },
        data: { balance: newAccBal },
      });

      // Record PaymentIn entry
      if (sale.partyId) {
        await tx.paymentIn.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId: sale.partyId,
            accountId: targetAccount.id,
            amount: actualPay,
            mode: paymentMode,
            date: new Date(),
            referenceNumber: sale.invoiceNumber,
            notes: notes || `Direct payment for Sale Invoice ${sale.invoiceNumber}`,
          },
        });
      }

      // Record Transaction entry
      await tx.transaction.create({
        data: {
          businessId: request.tenant!.businessId,
          accountId: targetAccount.id,
          category: TransactionCategory.SALE,
          amount: actualPay,
          referenceId: sale.id,
          description: notes || `Direct payment for Sale Invoice ${sale.invoiceNumber}`,
          date: new Date(),
        },
      });

      return updated;
    });

    createAuditLog({
      request,
      action: 'PAY_SALE',
      module: 'SALE',
      recordId: updatedSale.id,
      newValue: { invoiceNumber: updatedSale.invoiceNumber, paidAmount: Number(updatedSale.paidAmount), dueAmount: Number(updatedSale.dueAmount) },
    }).catch(() => {});

    return reply.send({ success: true, data: updatedSale });
  });

  // ----------------------------------------------------
  // LIST SALES RETURNS (Credit Notes)
  // ----------------------------------------------------
  fastify.get('/returns/list', async (request, reply) => {
    const returns = await request.db!.saleReturn.findMany({
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
  // CREATE SALES RETURN (Credit Note Transaction-Safe)
  // ----------------------------------------------------
  fastify.post('/returns', async (request, reply) => {
    const body = createSaleReturnSchema.parse(request.body);

    const saleReturn = await request.db!.$transaction(async (tx) => {
      // 0. Over-Return Validation against Original Sale Invoice (if linked)
      if (body.saleId) {
        const originalSale = await tx.sale.findFirst({
          where: { id: body.saleId, businessId: request.tenant!.businessId },
          include: { items: true },
        });

        if (!originalSale) {
          throw new AppError('Original sale invoice not found for this business tenant', 404, 'NOT_FOUND');
        }

        const previousReturns = await tx.saleReturn.findMany({
          where: { saleId: body.saleId, businessId: request.tenant!.businessId },
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
          const originalLine = originalSale.items.find((i) => i.itemId === line.itemId);
          if (!originalLine) {
            throw new AppError(
              `Item (ID: ${line.itemId}) was not included in original sale invoice #${originalSale.invoiceNumber}`,
              400,
              'INVALID_RETURN_ITEM'
            );
          }
          const alreadyReturned = returnedMap.get(line.itemId) || 0;
          const maxReturnable = Number(originalLine.quantity) - alreadyReturned;
          if (line.quantity > maxReturnable) {
            throw new AppError(
              `Over-return error: Cannot return ${line.quantity} units for item. Only ${maxReturnable} units remain returnable on Invoice #${originalSale.invoiceNumber}.`,
              400,
              'OVER_RETURN'
            );
          }
        }
      }

      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.saleReturnPrefix || 'CN-';

      let returnNumber = body.returnNumber;
      if (!returnNumber) {
        const count = await tx.saleReturn.count({
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

      const newReturn = await tx.saleReturn.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: body.partyId,
          saleId: body.saleId || null,
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

      // 1. Increase Stock & Log StockMovement (SALE_RETURN)
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
              type: StockMovementType.SALE_RETURN,
              quantity: qtyDecimal,
              reference: `Credit Note ${returnNumber}`,
            },
          });
        }
      }

      // 2. Immediate Cash/Bank Refund & Customer Receivable Adjustment
      const refundAmt = new Prisma.Decimal(body.refundAmount || 0);
      const creditToBalance = totalAmount.sub(refundAmt);

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
        const newAccBal = curAccBal.sub(refundAmt);
        await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: newAccBal },
        });

        await tx.paymentOut.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId: body.partyId,
            accountId: targetAccount.id,
            amount: refundAmt,
            mode: body.paymentMode || PaymentMode.CASH,
            date: new Date(body.date),
            referenceNumber: returnNumber,
            notes: `Cash refund for Credit Note ${returnNumber}`,
          },
        });

        await tx.transaction.create({
          data: {
            businessId: request.tenant!.businessId,
            accountId: targetAccount.id,
            category: TransactionCategory.SALE_RETURN,
            amount: refundAmt,
            referenceId: newReturn.id,
            description: `Cash refund for Credit Note ${returnNumber}`,
            date: new Date(body.date),
          },
        });
      }

      if (!creditToBalance.isZero()) {
        const party = await tx.party.findUnique({ where: { id: body.partyId } });
        if (party) {
          const curBal = new Prisma.Decimal(party.currentBalance || 0);
          const newBal = curBal.sub(creditToBalance);
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
      action: 'CREATE_SALE_RETURN',
      module: 'SALE',
      recordId: saleReturn.id,
      newValue: { returnNumber: saleReturn.returnNumber, totalAmount: Number(saleReturn.totalAmount) },
    }).catch(() => {});

    return reply.status(201).send({
      success: true,
      data: saleReturn,
    });
  });

  // ----------------------------------------------------
  // LIST QUOTATIONS
  // ----------------------------------------------------
  fastify.get('/quotations/list', async (request, reply) => {
    const quotations = await request.db!.quotation.findMany({
      include: {
        party: { select: { id: true, name: true, phone: true } },
        items: { include: { item: { select: { id: true, name: true, unit: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    return reply.send({
      success: true,
      data: quotations,
    });
  });

  // ----------------------------------------------------
  // CREATE QUOTATION
  // ----------------------------------------------------
  fastify.post('/quotations', async (request, reply) => {
    const body = createQuotationSchema.parse(request.body);

    const quotation = await request.db!.$transaction(async (tx) => {
      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.quotationPrefix || 'QT-';

      let quotationNumber = body.quotationNumber;
      if (!quotationNumber) {
        const count = await tx.quotation.count({
          where: { businessId: request.tenant!.businessId },
        });
        quotationNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;
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

      const newQuotation = await tx.quotation.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: body.partyId,
          quotationNumber,
          date: new Date(body.date),
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          status: QuotationStatus.SENT,
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

      return newQuotation;
    });

    return reply.status(201).send({
      success: true,
      data: quotation,
    });
  });

  // ----------------------------------------------------
  // CONVERT QUOTATION TO SALE INVOICE
  // ----------------------------------------------------
  fastify.post('/quotations/:id/convert', async (request, reply) => {
    const { id } = request.params as { id: string };

    const saleInvoice = await request.db!.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'NOT_FOUND');
      }

      if (quotation.status === QuotationStatus.CONVERTED) {
        throw new AppError('Quotation has already been converted to an invoice.', 400, 'ALREADY_CONVERTED');
      }

      // Check stock availability
      for (const line of quotation.items) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (item && item.type === 'PRODUCT') {
          const curStock = new Prisma.Decimal(item.currentStock || 0);
          const reqQty = new Prisma.Decimal(line.quantity);
          if (curStock.lessThan(reqQty)) {
            throw new AppError(
              `Insufficient stock for "${item.name}". Available: ${curStock}, Required: ${reqQty}`,
              400,
              'INSUFFICIENT_STOCK'
            );
          }
        }
      }

      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.invoicePrefix || 'INV-';
      const count = await tx.sale.count({ where: { businessId: request.tenant!.businessId } });
      const invoiceNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;

      // Create Sale Record
      const newSale = await tx.sale.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: quotation.partyId,
          invoiceNumber,
          date: new Date(),
          status: InvoiceStatus.UNPAID,
          subTotal: quotation.subTotal,
          taxAmount: quotation.taxAmount,
          discount: quotation.discount,
          totalAmount: quotation.totalAmount,
          paidAmount: 0,
          dueAmount: quotation.totalAmount,
          notes: `Converted from Quotation ${quotation.quotationNumber}`,
          items: {
            create: quotation.items.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxAmount: line.taxAmount,
              total: line.total,
            })),
          },
        },
      });

      // Update Quotation Status
      await tx.quotation.update({
        where: { id },
        data: { status: QuotationStatus.CONVERTED },
      });

      // Update Stock
      for (const line of quotation.items) {
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
              type: StockMovementType.SALE,
              quantity: qtyDecimal.negated(),
              reference: `Sale Invoice ${invoiceNumber} (Converted from ${quotation.quotationNumber})`,
            },
          });
        }
      }

      // Update Customer Receivable
      const party = await tx.party.findUnique({ where: { id: quotation.partyId } });
      if (party) {
        const curBal = new Prisma.Decimal(party.currentBalance || 0);
        const newBal = curBal.add(quotation.totalAmount);
        await tx.party.update({
          where: { id: quotation.partyId },
          data: { currentBalance: newBal },
        });
      }

      return newSale;
    });

    return reply.send({
      success: true,
      data: saleInvoice,
    });
  });
}

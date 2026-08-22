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
import {
  calculateInvoiceTotals,
  updatePartyBalance,
  updateAccountBalance,
  updateStock,
} from '../../services/accounting.service.js';

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

    const sale = await request.db!.sale.findUnique({
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
      // 1. Settings prefix & Tax Rate
      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.invoicePrefix || 'INV-';
      const vatRate = settings?.taxRate || 13;

      // 2. Generate unique Invoice Number
      let invoiceNumber = body.invoiceNumber;
      if (!invoiceNumber) {
        let count = await tx.sale.count({
          where: { businessId: request.tenant!.businessId },
        });
        let candidate = `${prefix}${String(count + 1).padStart(5, '0')}`;
        let exists = await tx.sale.findFirst({
          where: { businessId: request.tenant!.businessId, invoiceNumber: candidate },
        });
        while (exists) {
          count++;
          candidate = `${prefix}${String(count + 1).padStart(5, '0')}`;
          exists = await tx.sale.findFirst({
            where: { businessId: request.tenant!.businessId, invoiceNumber: candidate },
          });
        }
        invoiceNumber = candidate;
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

      // 3.5 Check stock availability for all physical products before creating the sale
      const requestedItemQuantities = new Map<string, Prisma.Decimal>();
      for (const line of body.items) {
        const currentQty = requestedItemQuantities.get(line.itemId) || new Prisma.Decimal(0);
        requestedItemQuantities.set(line.itemId, currentQty.add(new Prisma.Decimal(line.quantity)));
      }

      for (const [itemId, totalRequiredQty] of requestedItemQuantities.entries()) {
        const item = await tx.item.findFirst({
          where: { id: itemId, businessId: request.tenant!.businessId },
        });

        if (!item) {
          throw new AppError('Item not found or unauthorized', 404, 'ITEM_NOT_FOUND');
        }

        if (item.type === 'PRODUCT') {
          const curStock = new Prisma.Decimal(item.currentStock || 0);
          if (curStock.lessThanOrEqualTo(0)) {
            throw new AppError(
              `Item "${item.name}" is out of stock (Available: 0 ${item.unit}). Cannot create bill without available stock.`,
              400,
              'OUT_OF_STOCK'
            );
          }
          if (curStock.lessThan(totalRequiredQty)) {
            throw new AppError(
              `Insufficient stock for "${item.name}". Available: ${curStock.toNumber()} ${item.unit}, Total Requested in bill: ${totalRequiredQty.toNumber()} ${item.unit}.`,
              400,
              'INSUFFICIENT_STOCK'
            );
          }
        }
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

      // 4. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId,
          invoiceNumber,
          date: new Date(body.date),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
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
        const item = await tx.item.findFirst({ where: { id: line.itemId , businessId: request.tenant!.businessId } });
        if (item && item.type === 'PRODUCT') {
          await updateStock(tx as any, line.itemId, request.tenant!.businessId, line.quantity, 'REDUCE');
          await tx.stockMovement.create({
            data: {
              businessId: request.tenant!.businessId,
              itemId: line.itemId,
              type: StockMovementType.SALE,
              quantity: new Prisma.Decimal(line.quantity).negated(),
              reference: `Sale Invoice ${invoiceNumber}`,
            },
          });
        }
      }

      // 6. Update Customer Balance (Increase Receivable)
      await updatePartyBalance(tx as any, partyId, request.tenant!.businessId, totals.totalAmount, 'ADD_RECEIVABLE');

      // 7. Handle Payment
      if (paidAmount.greaterThan(0)) {
        await updatePartyBalance(tx as any, partyId, request.tenant!.businessId, paidAmount, 'REDUCE_RECEIVABLE');

        const desiredType =
          body.paymentMode === PaymentMode.BANK || body.paymentMode === PaymentMode.CHEQUE
            ? AccountType.BANK
            : body.paymentMode === PaymentMode.ONLINE
            ? AccountType.MOBILE_WALLET
            : AccountType.CASH;

        let targetAccount = body.accountId
          ? await tx.account.findFirst({ where: { id: body.accountId , businessId: request.tenant!.businessId } })
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
            },
          });
        }

        await updateAccountBalance(tx as any, targetAccount.id, request.tenant!.businessId, paidAmount, 'ADD');

        await tx.paymentIn.create({
          data: {
            businessId: request.tenant!.businessId,
            partyId,
            accountId: targetAccount.id,
            amount: paidAmount,
            mode: body.paymentMode,
            date: new Date(body.date),
            referenceNumber: invoiceNumber,
            notes: `Payment for Sale Invoice ${invoiceNumber}`,
          },
        });

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
    }, { maxWait: 10000, timeout: 20000 });

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
      const sale = await tx.sale.findUnique({
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

      const payAmt = amount && amount > 0 ? new Prisma.Decimal(amount) : curDue;
      const actualPay = payAmt.greaterThan(curDue) ? curDue : payAmt;

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
        const party = await tx.party.findFirst({ where: { id: sale.partyId , businessId: request.tenant!.businessId } });
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
        ? await tx.account.findFirst({ where: { id: accountId , businessId: request.tenant!.businessId } })
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
    }, { maxWait: 10000, timeout: 20000 });

    return reply.send({ success: true, data: updatedSale });
  });

  // ----------------------------------------------------
  // LIST SALES RETURNS (Credit Notes)
  // ----------------------------------------------------
  fastify.get('/returns/list', async (request, reply) => {
    const returns = await request.db!.saleReturn.findMany({
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

  // GET SINGLE SALES RETURN
  fastify.get('/returns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const saleReturn = await request.db!.saleReturn.findFirst({
      where: { id, businessId: request.tenant!.businessId },
      include: {
        party: true,
        items: { include: { item: true } },
      },
    });

    if (!saleReturn) {
      throw new AppError('Sales Return (Credit Note) not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: saleReturn,
    });
  });

  // ----------------------------------------------------
  // CREATE SALES RETURN (Credit Note Transaction-Safe)
  // ----------------------------------------------------
  fastify.post('/returns', async (request, reply) => {
    const body = createSaleReturnSchema.parse(request.body);

    const saleReturn = await request.db!.$transaction(async (tx) => {
      const settings = await tx.businessSetting.findUnique({
        where: { businessId: request.tenant!.businessId },
      });
      const prefix = settings?.saleReturnPrefix || 'CN-';
      const vatRate = settings?.enableTax ? Number(settings.taxRate) : 0;

      let returnNumber = body.returnNumber;
      if (!returnNumber) {
        const count = await tx.saleReturn.count({
          where: { businessId: request.tenant!.businessId },
        });
        returnNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;
      }

      // Check if it's returning against a specific sale
      let isVatBill = false;
      if (body.saleId) {
        const sale = await tx.sale.findFirst({ where: { id: body.saleId , businessId: request.tenant!.businessId } });
        if (sale) {
          isVatBill = sale.isVatBill;
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

      // 3. Create SaleReturn
      const newReturn = await tx.saleReturn.create({
        data: {
          businessId: request.tenant!.businessId,
          partyId: body.partyId,
          saleId: body.saleId || null,
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

      // 4. Update Original Sale and Quantities
      if (body.saleId) {
        await tx.sale.update({
          where: { id: body.saleId },
          data: { status: 'RETURNED' },
        });

        for (const line of body.items) {
          const saleItem = await tx.saleItem.findFirst({
            where: { saleId: body.saleId, itemId: line.itemId },
          });
          if (saleItem) {
            const currentRet = new Prisma.Decimal(saleItem.returnedQuantity || 0);
            const reqRet = new Prisma.Decimal(line.quantity);
            const maxAllowed = new Prisma.Decimal(saleItem.quantity);

            if (currentRet.add(reqRet).greaterThan(maxAllowed)) {
              throw new AppError(`Cannot return more than originally sold. Allowed remaining: ${maxAllowed.sub(currentRet).toNumber()}`, 400);
            }

            await tx.saleItem.update({
              where: { id: saleItem.id },
              data: { returnedQuantity: currentRet.add(reqRet) },
            });
          }
        }
      }

      // 5. Increase Stock atomically
      for (const line of body.items) {
        await updateStock(tx as any, line.itemId, request.tenant!.businessId, line.quantity, 'ADD');
        await tx.stockMovement.create({
          data: {
            businessId: request.tenant!.businessId,
            itemId: line.itemId,
            type: StockMovementType.SALE_RETURN,
            quantity: new Prisma.Decimal(line.quantity),
            reference: `Credit Note ${returnNumber}`,
          },
        });
      }

      // 6. Handle Financials
      const refundAmt = new Prisma.Decimal(body.refundAmount || 0);
      const creditToBalance = totals.totalAmount.sub(refundAmt); // Amount not refunded immediately

      if (refundAmt.greaterThan(0)) {
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

        // Refund means money out
        await updateAccountBalance(tx as any, targetAccount.id, request.tenant!.businessId, refundAmt.toNumber(), 'REDUCE');

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
            description: `Refund for Credit Note ${returnNumber}`,
            date: new Date(body.date),
          },
        });
      }

      // Adjust customer balance (Credit note reduces what they owe us)
      // For a customer, positive balance means receivable. Reducing receivable means subtract.
      if (!creditToBalance.isZero()) {
        await updatePartyBalance(tx as any, body.partyId, request.tenant!.businessId, creditToBalance.toNumber(), 'REDUCE_RECEIVABLE');
      }

      return newReturn;
    }, { maxWait: 10000, timeout: 20000 });

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
    }, { maxWait: 10000, timeout: 20000 });

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
      const requestedItemQuantities = new Map<string, Prisma.Decimal>();
      for (const line of quotation.items) {
        const currentQty = requestedItemQuantities.get(line.itemId) || new Prisma.Decimal(0);
        requestedItemQuantities.set(line.itemId, currentQty.add(new Prisma.Decimal(line.quantity)));
      }

      for (const [itemId, totalRequiredQty] of requestedItemQuantities.entries()) {
        const item = await tx.item.findFirst({ where: { id: itemId, businessId: request.tenant!.businessId } });
        if (item && item.type === 'PRODUCT') {
          const curStock = new Prisma.Decimal(item.currentStock || 0);
          if (curStock.lessThanOrEqualTo(0)) {
            throw new AppError(
              `Item "${item.name}" is out of stock (Available: 0 ${item.unit}). Cannot convert quotation to invoice.`,
              400,
              'OUT_OF_STOCK'
            );
          }
          if (curStock.lessThan(totalRequiredQty)) {
            throw new AppError(
              `Insufficient stock for "${item.name}". Available: ${curStock.toNumber()} ${item.unit}, Required: ${totalRequiredQty.toNumber()} ${item.unit}.`,
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
        const item = await tx.item.findFirst({ where: { id: line.itemId , businessId: request.tenant!.businessId } });
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
      const party = await tx.party.findFirst({ where: { id: quotation.partyId , businessId: request.tenant!.businessId } });
      if (party) {
        const curBal = new Prisma.Decimal(party.currentBalance || 0);
        const newBal = curBal.add(quotation.totalAmount);
        await tx.party.update({
          where: { id: quotation.partyId },
          data: { currentBalance: newBal },
        });
      }

      return newSale;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.send({
      success: true,
      data: saleInvoice,
    });
  });
}

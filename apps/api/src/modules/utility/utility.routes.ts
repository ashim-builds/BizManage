import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { partySchema, itemSchema } from '@bizmanage/validation';
import { PartyType, ItemType, Prisma, globalPrisma } from '@bizmanage/database';
import { z } from 'zod';

export async function utilityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // 1. IMPORT PARTIES (Validate & Transaction Import)
  // ----------------------------------------------------
  fastify.post('/import-parties', async (request, reply) => {
    const { rows } = request.body as { rows: any[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { message: 'No party rows provided for import' },
      });
    }

    const validRecords: any[] = [];
    const errors: Array<{ row: number; name: string; error: string }> = [];

    rows.forEach((row, idx) => {
      try {
        const parsed = partySchema.parse({
          name: row.name,
          type: row.type || PartyType.CUSTOMER,
          phone: row.phone || null,
          email: row.email || null,
          address: row.address || null,
          taxNumber: row.taxNumber || null,
          openingBalance: Number(row.openingBalance || 0),
          openingBalanceType: row.openingBalanceType || 'RECEIVABLE',
        });
        validRecords.push(parsed);
      } catch (err: any) {
        errors.push({
          row: idx + 1,
          name: row.name || `Row ${idx + 1}`,
          error: err.errors?.[0]?.message || 'Invalid row schema',
        });
      }
    });

    if (errors.length > 0 && validRecords.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { message: 'Validation failed for all imported party records' },
        data: { errors, validRecordsCount: 0 },
      });
    }

    // Insert valid records in a single transaction
    const createdParties = await request.db!.$transaction(async (tx) => {
      const results = [];
      for (const rec of validRecords) {
        let initialBal = new Prisma.Decimal(rec.openingBalance || 0);
        if (rec.openingBalanceType === 'PAYABLE') {
          initialBal = initialBal.negated();
        }

        const party = await tx.party.create({
          data: {
            businessId: request.tenant!.businessId,
            name: rec.name,
            type: rec.type,
            phone: rec.phone,
            email: rec.email,
            address: rec.address,
            taxNumber: rec.taxNumber,
            openingBalance: initialBal,
            currentBalance: initialBal,
          },
        });
        results.push(party);
      }
      return results;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.status(201).send({
      success: true,
      data: {
        importedCount: createdParties.length,
        errors,
      },
    });
  });

  // ----------------------------------------------------
  // 2. IMPORT ITEMS (Validate & Transaction Import)
  // ----------------------------------------------------
  fastify.post('/import-items', async (request, reply) => {
    const { rows } = request.body as { rows: any[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { message: 'No item rows provided for import' },
      });
    }

    const validRecords: any[] = [];
    const errors: Array<{ row: number; name: string; error: string }> = [];

    rows.forEach((row, idx) => {
      try {
        const parsed = itemSchema.parse({
          name: row.name,
          code: row.code || null,
          type: row.type || ItemType.PRODUCT,
          unit: row.unit || 'Pcs',
          salePrice: Number(row.salePrice || 0),
          purchasePrice: Number(row.purchasePrice || 0),
          minStockAlert: Number(row.minStockAlert || 0),
          openingStock: Number(row.openingStock || 0),
        });
        validRecords.push(parsed);
      } catch (err: any) {
        errors.push({
          row: idx + 1,
          name: row.name || `Row ${idx + 1}`,
          error: err.errors?.[0]?.message || 'Invalid row schema',
        });
      }
    });

    if (errors.length > 0 && validRecords.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { message: 'Validation failed for all imported item records' },
        data: { errors, validRecordsCount: 0 },
      });
    }

    // Insert valid records in a single transaction
    const createdItems = await request.db!.$transaction(async (tx) => {
      const results = [];
      for (const rec of validRecords) {
        const stock = new Prisma.Decimal(rec.openingStock || 0);

        const item = await tx.item.create({
          data: {
            businessId: request.tenant!.businessId,
            name: rec.name,
            code: rec.code,
            type: rec.type,
            unit: rec.unit,
            salePrice: new Prisma.Decimal(rec.salePrice || 0),
            purchasePrice: new Prisma.Decimal(rec.purchasePrice || 0),
            minStockAlert: new Prisma.Decimal(rec.minStockAlert || 0),
            openingStock: stock,
            currentStock: stock,
          },
        });
        results.push(item);
      }
      return results;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.status(201).send({
      success: true,
      data: {
        importedCount: createdItems.length,
        errors,
      },
    });
  });

  // ----------------------------------------------------
  // 3. SECURE BUSINESS BACKUP DATA EXPORT
  // ----------------------------------------------------
  fastify.get('/backup', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    const [
      business,
      settings,
      accounts,
      parties,
      items,
      sales,
      purchases,
      paymentsIn,
      paymentsOut,
      expenses,
      incomes,
    ] = await Promise.all([
      request.db!.business.findUnique({ where: { id: businessId } }),
      request.db!.businessSetting.findUnique({ where: { businessId } }),
      request.db!.account.findMany({ where: { businessId } }),
      request.db!.party.findMany({ where: { businessId } }),
      request.db!.item.findMany({ where: { businessId } }),
      request.db!.sale.findMany({ where: { businessId }, include: { items: true } }),
      request.db!.purchase.findMany({ where: { businessId }, include: { items: true } }),
      request.db!.paymentIn.findMany({ where: { businessId } }),
      request.db!.paymentOut.findMany({ where: { businessId } }),
      request.db!.expense.findMany({ where: { businessId } }),
      request.db!.income.findMany({ where: { businessId } }),
    ]);

    const backupDump = {
      exportTimestamp: new Date().toISOString(),
      business,
      settings,
      accounts,
      parties,
      items,
      sales,
      purchases,
      paymentsIn,
      paymentsOut,
      expenses,
      incomes,
    };

    return reply.send({
      success: true,
      data: backupDump,
    });
  });

  // ----------------------------------------------------
  // 4. REAL-TIME DYNAMIC SYSTEM & LOW STOCK NOTIFICATIONS
  // ----------------------------------------------------
  fastify.get('/notifications', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    const [business, items, pendingSales, paymentRequests] = await Promise.all([
      request.db!.business.findUnique({ where: { id: businessId } }),
      request.db!.item.findMany({
        where: { type: 'PRODUCT' },
        select: { id: true, name: true, unit: true, currentStock: true, minStockAlert: true, updatedAt: true },
      }),
      request.db!.sale.findMany({
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
        select: { id: true, invoiceNumber: true, dueAmount: true, createdAt: true, party: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      globalPrisma.subscriptionPayment.findMany({
        where: { businessId },
        include: { subscriptionPackage: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const notifications: Array<{
      id: string;
      type: 'WARNING' | 'INFO' | 'SUCCESS';
      title: string;
      message: string;
      createdAt: string;
      link: string;
    }> = [];

    // Subscription Payment Approval, Rejection & Pending Notifications
    paymentRequests.forEach((payment: any) => {
      if (payment.status === 'COMPLETED') {
        notifications.push({
          id: `payment-approved-${payment.id}`,
          type: 'SUCCESS',
          title: `🎉 Plan Approved: ${payment.subscriptionPackage.name}`,
          message: `Your payment of Rs. ${Number(payment.amount)} for ${payment.subscriptionPackage.name} has been verified and approved by Superadmin. Your plan is now active.`,
          createdAt: payment.updatedAt.toISOString(),
          link: '/subscription',
        });
      } else if (payment.status === 'REJECTED') {
        notifications.push({
          id: `payment-rejected-${payment.id}`,
          type: 'WARNING',
          title: `❌ Payment Rejected: ${payment.subscriptionPackage.name}`,
          message: `Your payment request (Ref: ${payment.referenceId}) was rejected. Reason: "${payment.failureReason || 'Deposit could not be verified in bank records.'}"`,
          createdAt: payment.updatedAt.toISOString(),
          link: '/subscription',
        });
      } else if (payment.status === 'PENDING') {
        notifications.push({
          id: `payment-pending-${payment.id}`,
          type: 'INFO',
          title: `⏳ Verification Pending: ${payment.subscriptionPackage.name}`,
          message: `Payment request for ${payment.subscriptionPackage.name} (Ref: ${payment.referenceId}) is under Superadmin review.`,
          createdAt: payment.createdAt.toISOString(),
          link: '/subscription',
        });
      }
    });

    // Low stock items
    items.forEach((item: any) => {
      if (Number(item.currentStock) <= Number(item.minStockAlert)) {
        notifications.push({
          id: `low-stock-${item.id}`,
          type: 'WARNING',
          title: 'Low Stock Alert',
          message: `"${item.name}" stock is low (${Number(item.currentStock)} ${item.unit} remaining, alert threshold: ${Number(item.minStockAlert)} ${item.unit}).`,
          createdAt: item.updatedAt.toISOString(),
          link: '/inventory?lowStock=true',
        });
      }
    });

    // Unpaid invoices
    pendingSales.forEach((sale: any) => {
      notifications.push({
        id: `unpaid-sale-${sale.id}`,
        type: 'INFO',
        title: 'Pending Invoice Payment',
        message: `Invoice #${sale.invoiceNumber} for ${sale.party?.name || 'Customer'} has unpaid balance of Rs. ${Number(sale.dueAmount)}.`,
        createdAt: sale.createdAt.toISOString(),
        link: '/transactions/sales',
      });
    });

    // System Status
    if (business) {
      notifications.push({
        id: `system-status-${business.id}`,
        type: 'SUCCESS',
        title: 'System Active',
        message: `Multi-tenant ERP active for "${business.name}".`,
        createdAt: business.createdAt ? new Date(business.createdAt).toISOString() : new Date(0).toISOString(),
        link: '/settings',
      });
    }

    // MANDATORY SORTING: Newest notifications at the top
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return reply.send({
      success: true,
      data: {
        unreadCount: notifications.length,
        notifications,
      },
    });
  });
}

import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { partySchema, itemSchema } from '@bizmanage/validation';
import { PartyType, ItemType, Prisma, globalPrisma } from '@bizmanage/database';
import { z } from 'zod';
import crypto from 'crypto';

export async function utilityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // 1. IMPORT PARTIES (Validate & Batch Import)
  // ----------------------------------------------------
  fastify.post('/import-parties', async (request, reply) => {
    let rows = (request.body as any)?.rows;
    if (!rows && Array.isArray(request.body)) {
      rows = request.body;
    }
    if (!rows && (request.body as any)?.parties) {
      rows = (request.body as any).parties;
    }
    if (!rows && (request.body as any)?.data?.parties) {
      rows = (request.body as any).data.parties;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { message: 'No party rows found in provided file. Expected an array of parties or a full backup file.' },
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
          openingBalance: Number(row.openingBalance || row.currentBalance || 0),
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

    const businessId = request.tenant!.businessId;
    const partiesToCreate = validRecords.map((rec) => {
      let initialBal = new Prisma.Decimal(rec.openingBalance || 0);
      if (rec.openingBalanceType === 'PAYABLE') {
        initialBal = initialBal.negated();
      }
      return {
        id: crypto.randomUUID(),
        businessId,
        name: rec.name,
        type: rec.type,
        phone: rec.phone,
        email: rec.email,
        address: rec.address,
        taxNumber: rec.taxNumber,
        openingBalance: initialBal,
        currentBalance: initialBal,
      };
    });

    const CHUNK_SIZE = 200;
    let createdCount = 0;

    for (let i = 0; i < partiesToCreate.length; i += CHUNK_SIZE) {
      const chunk = partiesToCreate.slice(i, i + CHUNK_SIZE);
      await request.db!.party.createMany({
        data: chunk,
      });
      createdCount += chunk.length;
    }

    return reply.status(201).send({
      success: true,
      data: {
        importedCount: createdCount,
        errors,
      },
    });
  });

  // ----------------------------------------------------
  // 2. IMPORT ITEMS (Validate & Batch Import)
  // ----------------------------------------------------
  fastify.post('/import-items', async (request, reply) => {
    let rows = (request.body as any)?.rows;
    if (!rows && Array.isArray(request.body)) {
      rows = request.body;
    }
    if (!rows && (request.body as any)?.items) {
      rows = (request.body as any).items;
    }
    if (!rows && (request.body as any)?.data?.items) {
      rows = (request.body as any).data.items;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { message: 'No item rows found in provided file. Expected an array of items or a full backup file.' },
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
          openingStock: Number(row.openingStock || row.currentStock || 0),
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

    const businessId = request.tenant!.businessId;
    const itemsToCreate = validRecords.map((rec) => {
      const stock = new Prisma.Decimal(rec.openingStock || 0);
      return {
        id: crypto.randomUUID(),
        businessId,
        name: rec.name,
        code: rec.code,
        type: rec.type,
        unit: rec.unit,
        salePrice: new Prisma.Decimal(rec.salePrice || 0),
        purchasePrice: new Prisma.Decimal(rec.purchasePrice || 0),
        minStockAlert: new Prisma.Decimal(rec.minStockAlert || 0),
        openingStock: stock,
        currentStock: stock,
      };
    });

    const CHUNK_SIZE = 200;
    let createdCount = 0;

    for (let i = 0; i < itemsToCreate.length; i += CHUNK_SIZE) {
      const chunk = itemsToCreate.slice(i, i + CHUNK_SIZE);
      await request.db!.item.createMany({
        data: chunk,
      });
      createdCount += chunk.length;
    }

    return reply.status(201).send({
      success: true,
      data: {
        importedCount: createdCount,
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
    const userId = request.user.id;

    const [business, items, pendingSales, paymentRequests, readEntries] = await Promise.all([
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
      globalPrisma.notificationRead.findMany({
        where: { userId },
        select: { notificationId: true },
      }),
    ]);

    const readIdSet = new Set(readEntries.map((r: any) => r.notificationId));

    const notifications: Array<{
      id: string;
      type: 'WARNING' | 'INFO' | 'SUCCESS';
      title: string;
      message: string;
      createdAt: string;
      link: string;
      isRead: boolean;
    }> = [];

    // Subscription Payment Approval, Rejection & Pending Notifications
    paymentRequests.forEach((payment: any) => {
      if (payment.status === 'COMPLETED') {
        const id = `payment-approved-${payment.id}`;
        notifications.push({
          id,
          type: 'SUCCESS',
          title: `🎉 Plan Approved: ${payment.subscriptionPackage.name}`,
          message: `Your payment of Rs. ${Number(payment.amount)} for ${payment.subscriptionPackage.name} has been verified and approved by Superadmin. Your plan is now active.`,
          createdAt: payment.updatedAt.toISOString(),
          link: '/subscription',
          isRead: readIdSet.has(id),
        });
      } else if (payment.status === 'REJECTED') {
        const id = `payment-rejected-${payment.id}`;
        notifications.push({
          id,
          type: 'WARNING',
          title: `❌ Payment Rejected: ${payment.subscriptionPackage.name}`,
          message: `Your payment request (Ref: ${payment.referenceId}) was rejected. Reason: "${payment.failureReason || 'Deposit could not be verified in bank records.'}"`,
          createdAt: payment.updatedAt.toISOString(),
          link: '/subscription',
          isRead: readIdSet.has(id),
        });
      } else if (payment.status === 'PENDING') {
        const id = `payment-pending-${payment.id}`;
        notifications.push({
          id,
          type: 'INFO',
          title: `⏳ Verification Pending: ${payment.subscriptionPackage.name}`,
          message: `Payment request for ${payment.subscriptionPackage.name} (Ref: ${payment.referenceId}) is under Superadmin review.`,
          createdAt: payment.createdAt.toISOString(),
          link: '/subscription',
          isRead: readIdSet.has(id),
        });
      }
    });

    // Low stock items
    items.forEach((item: any) => {
      if (Number(item.currentStock) <= Number(item.minStockAlert)) {
        const id = `low-stock-${item.id}`;
        notifications.push({
          id,
          type: 'WARNING',
          title: 'Low Stock Alert',
          message: `"${item.name}" stock is low (${Number(item.currentStock)} ${item.unit} remaining, alert threshold: ${Number(item.minStockAlert)} ${item.unit}).`,
          createdAt: item.updatedAt.toISOString(),
          link: '/inventory?lowStock=true',
          isRead: readIdSet.has(id),
        });
      }
    });

    // Unpaid invoices
    pendingSales.forEach((sale: any) => {
      const id = `unpaid-sale-${sale.id}`;
      notifications.push({
        id,
        type: 'INFO',
        title: 'Pending Invoice Payment',
        message: `Invoice #${sale.invoiceNumber} for ${sale.party?.name || 'Customer'} has unpaid balance of Rs. ${Number(sale.dueAmount)}.`,
        createdAt: sale.createdAt.toISOString(),
        link: '/transactions/sales',
        isRead: readIdSet.has(id),
      });
    });

    // System Status
    if (business) {
      const id = `system-status-${business.id}`;
      notifications.push({
        id,
        type: 'SUCCESS',
        title: 'System Active',
        message: `Multi-tenant ERP active for "${business.name}".`,
        createdAt: business.createdAt ? new Date(business.createdAt).toISOString() : new Date(0).toISOString(),
        link: '/settings',
        isRead: readIdSet.has(id),
      });
    }

    // MANDATORY SORTING: Newest notifications at the top
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return reply.send({
      success: true,
      data: {
        unreadCount,
        readNotifIds: Array.from(readIdSet),
        notifications,
      },
    });
  });

  // 4b. MARK NOTIFICATION(S) AS READ IN MYSQL
  fastify.post('/notifications/mark-read', async (request, reply) => {
    const userId = request.user.id;
    const body = (request.body as any) || {};
    const { notificationId, notificationIds, markAll } = body;

    let idsToMark: string[] = [];

    if (markAll) {
      if (Array.isArray(notificationIds) && notificationIds.length > 0) {
        idsToMark = notificationIds;
      } else {
        const businessId = request.tenant!.businessId;
        const [items, pendingSales, paymentRequests] = await Promise.all([
          request.db!.item.findMany({
            where: { type: 'PRODUCT' },
            select: { id: true, currentStock: true, minStockAlert: true },
          }),
          request.db!.sale.findMany({
            where: { status: { in: ['UNPAID', 'PARTIAL'] } },
            select: { id: true },
            take: 20,
          }),
          globalPrisma.subscriptionPayment.findMany({
            where: { businessId },
            select: { id: true, status: true },
            take: 10,
          }),
        ]);

        items.forEach((item: any) => {
          if (Number(item.currentStock) <= Number(item.minStockAlert)) {
            idsToMark.push(`low-stock-${item.id}`);
          }
        });
        pendingSales.forEach((sale: any) => {
          idsToMark.push(`unpaid-sale-${sale.id}`);
        });
        paymentRequests.forEach((p: any) => {
          if (p.status === 'COMPLETED') idsToMark.push(`payment-approved-${p.id}`);
          else if (p.status === 'REJECTED') idsToMark.push(`payment-rejected-${p.id}`);
          else if (p.status === 'PENDING') idsToMark.push(`payment-pending-${p.id}`);
        });
        if (businessId) {
          idsToMark.push(`system-status-${businessId}`);
        }
      }
    } else if (notificationId) {
      idsToMark = [notificationId];
    } else if (Array.isArray(notificationIds)) {
      idsToMark = notificationIds;
    }

    if (idsToMark.length > 0) {
      await globalPrisma.notificationRead.createMany({
        data: idsToMark.map((id) => ({
          userId,
          notificationId: id,
        })),
        skipDuplicates: true,
      });
    }

    return reply.send({
      success: true,
      message: 'Notifications marked as read',
      markedIds: idsToMark,
    });
  });

  // 4c. MARK NOTIFICATION(S) AS UNREAD IN MYSQL
  fastify.post('/notifications/mark-unread', async (request, reply) => {
    const userId = request.user.id;
    const body = (request.body as any) || {};
    const { notificationId, notificationIds, markAll } = body;

    if (markAll) {
      await globalPrisma.notificationRead.deleteMany({
        where: { userId },
      });
      return reply.send({ success: true, message: 'All notifications marked as unread' });
    }

    const ids = notificationId ? [notificationId] : Array.isArray(notificationIds) ? notificationIds : [];
    if (ids.length > 0) {
      await globalPrisma.notificationRead.deleteMany({
        where: {
          userId,
          notificationId: { in: ids },
        },
      });
    }

    return reply.send({ success: true, message: 'Notification marked as unread' });
  });

  // ----------------------------------------------------
  // 5. EXPORT COMPLETE DATABASE BACKUP (.JSON) FOR CURRENT BUSINESS ID
  // ----------------------------------------------------
  fastify.get('/export-backup', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    try {
      const [
        business,
        settings,
        partyCategories,
        itemCategories,
        parties,
        items,
        sales,
        saleReturns,
        purchases,
        purchaseReturns,
        paymentsIn,
        paymentsOut,
        expenses,
        incomes,
        accounts,
        transactions,
        accountTransfers,
        stockMovements,
      ] = await Promise.all([
        request.db!.business.findUnique({
          where: { id: businessId },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            taxNumber: true,
            currency: true,
            logoUrl: true,
            createdAt: true,
          },
        }),
        request.db!.businessSetting.findUnique({ where: { businessId } }),
        request.db!.partyCategory.findMany({ where: { businessId } }),
        request.db!.itemCategory.findMany({ where: { businessId } }),
        request.db!.party.findMany({ where: { businessId } }),
        request.db!.item.findMany({ where: { businessId } }),
        request.db!.sale.findMany({
          where: { businessId },
          include: { items: true },
        }),
        request.db!.saleReturn.findMany({
          where: { businessId },
          include: { items: true },
        }),
        request.db!.purchase.findMany({
          where: { businessId },
          include: { items: true },
        }),
        request.db!.purchaseReturn.findMany({
          where: { businessId },
          include: { items: true },
        }),
        request.db!.paymentIn.findMany({ where: { businessId } }),
        request.db!.paymentOut.findMany({ where: { businessId } }),
        request.db!.expense.findMany({ where: { businessId } }),
        request.db!.income.findMany({ where: { businessId } }),
        request.db!.account.findMany({ where: { businessId } }),
        request.db!.transaction.findMany({ where: { businessId } }),
        request.db!.accountTransfer.findMany({ where: { businessId } }),
        request.db!.stockMovement.findMany({ where: { businessId } }),
      ]);

      const totalRecords =
        (parties?.length || 0) +
        (items?.length || 0) +
        (sales?.length || 0) +
        (purchases?.length || 0) +
        (paymentsIn?.length || 0) +
        (paymentsOut?.length || 0) +
        (expenses?.length || 0) +
        (incomes?.length || 0) +
        (accounts?.length || 0) +
        (transactions?.length || 0);

      return reply.send({
        success: true,
        data: {
          metadata: {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            businessId,
            businessName: business?.name || 'BizManage Business',
            totalRecords,
          },
          business,
          settings,
          partyCategories,
          itemCategories,
          parties,
          items,
          sales,
          saleReturns,
          purchases,
          purchaseReturns,
          paymentsIn,
          paymentsOut,
          expenses,
          incomes,
          accounts,
          transactions,
          accountTransfers,
          stockMovements,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: { message: err?.message || 'Failed to generate database backup' },
      });
    }
  });

  // ----------------------------------------------------
  // 6. RESTORE BUSINESS BACKUP (.JSON)
  // ----------------------------------------------------
  fastify.post('/restore-backup', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const backupData = (request.body as any)?.data || request.body;

    if (!backupData || (!backupData.items && !backupData.parties)) {
      return reply.status(400).send({
        success: false,
        error: { message: 'Invalid backup file structure' },
      });
    }

    let restoredCount = 0;

    // Restore party categories
    if (Array.isArray(backupData.partyCategories)) {
      for (const cat of backupData.partyCategories) {
        try {
          const { id, createdAt, updatedAt, parties, ...rest } = cat;
          await request.db!.partyCategory.upsert({
            where: { id: cat.id },
            update: { name: cat.name },
            create: { ...rest, id: cat.id, businessId },
          });
          restoredCount++;
        } catch (_) {}
      }
    }

    // Restore item categories
    if (Array.isArray(backupData.itemCategories)) {
      for (const cat of backupData.itemCategories) {
        try {
          const { id, createdAt, updatedAt, items, ...rest } = cat;
          await request.db!.itemCategory.upsert({
            where: { id: cat.id },
            update: { name: cat.name },
            create: { ...rest, id: cat.id, businessId },
          });
          restoredCount++;
        } catch (_) {}
      }
    }

    // Restore parties
    if (Array.isArray(backupData.parties)) {
      for (const p of backupData.parties) {
        try {
          const { id, createdAt, updatedAt, quotations, sales, saleReturns, purchases, purchaseReturns, paymentsIn, paymentsOut, category, ...rest } = p;
          await request.db!.party.upsert({
            where: { id: p.id },
            update: { currentBalance: p.currentBalance, phone: p.phone, address: p.address },
            create: { ...rest, id: p.id, businessId },
          });
          restoredCount++;
        } catch (_) {}
      }
    }

    // Restore items
    if (Array.isArray(backupData.items)) {
      for (const itm of backupData.items) {
        try {
          const { id, createdAt, updatedAt, quotationItems, saleItems, saleReturnItems, purchaseItems, purchaseReturnItems, stockMovements, category, ...rest } = itm;
          await request.db!.item.upsert({
            where: { id: itm.id },
            update: { currentStock: itm.currentStock, salePrice: itm.salePrice, purchasePrice: itm.purchasePrice },
            create: { ...rest, id: itm.id, businessId },
          });
          restoredCount++;
        } catch (_) {}
      }
    }

    // Restore accounts
    if (Array.isArray(backupData.accounts)) {
      for (const acc of backupData.accounts) {
        try {
          const { id, createdAt, updatedAt, transactions, fromTransfers, toTransfers, paymentsIn, paymentsOut, ...rest } = acc;
          const bal = acc.balance !== undefined ? acc.balance : (acc.currentBalance ?? 0);
          await request.db!.account.upsert({
            where: { id: acc.id },
            update: { accountName: acc.accountName, balance: bal },
            create: { ...rest, balance: bal, id: acc.id, businessId },
          });
          restoredCount++;
        } catch (_) {}
      }
    }

    return reply.send({
      success: true,
      message: `Successfully restored ${restoredCount} database records from backup.`,
    });
  });
}

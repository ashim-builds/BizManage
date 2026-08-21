import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { itemSchema, updateItemSchema, stockAdjustmentSchema } from '@bizmanage/validation';
import { ItemType, StockMovementType, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';
import crypto from 'crypto';

export async function itemRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // GET INVENTORY SUMMARY (Total Stock Valuation & Low Stock Count)
  // ----------------------------------------------------
  fastify.get('/summary', async (request, reply) => {
    const items = await request.db!.item.findMany({
      where: { type: ItemType.PRODUCT },
      select: {
        currentStock: true,
        purchasePrice: true,
        salePrice: true,
        minStockAlert: true,
      },
    });

    let totalCostValuation = new Prisma.Decimal(0);
    let totalSaleValuation = new Prisma.Decimal(0);
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of items) {
      const stock = new Prisma.Decimal(item.currentStock || 0);
      const purchasePrice = new Prisma.Decimal(item.purchasePrice || 0);
      const salePrice = new Prisma.Decimal(item.salePrice || 0);

      if (stock.isPositive()) {
        totalCostValuation = totalCostValuation.add(stock.mul(purchasePrice));
        totalSaleValuation = totalSaleValuation.add(stock.mul(salePrice));
      }

      if (stock.lessThanOrEqualTo(0)) {
        outOfStockCount++;
      } else if (stock.lessThanOrEqualTo(item.minStockAlert)) {
        lowStockCount++;
      }
    }

    return reply.send({
      success: true,
      data: {
        totalItems: items.length,
        totalCostValuation: totalCostValuation.toNumber(),
        totalSaleValuation: totalSaleValuation.toNumber(),
        lowStockCount,
        outOfStockCount,
      },
    });
  });

  // ----------------------------------------------------
  // LIST ITEMS WITH SEARCH & FILTERS
  // ----------------------------------------------------
  fastify.get('/', async (request, reply) => {
    const { search, categoryId, type, lowStock, page = '1', limit = '50', dateFrom, dateTo } = request.query as {
      search?: string;
      categoryId?: string;
      type?: ItemType;
      lowStock?: string;
      page?: string;
      limit?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.ItemWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (type) {
      whereClause.type = type;
    }

    if (categoryId) {
      if (categoryId === 'none') {
        whereClause.categoryId = null;
      } else {
        whereClause.categoryId = categoryId;
      }
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDate;
      }
    }

    if (search) {
      // NOTE: With E2EE, we cannot use ILIKE on encrypted strings!
      // We must query against the HMAC column. This means search is EXACT MATCH only.
      // We will hash the search term on the backend using the same static secret.
      const searchHmac = crypto.createHmac('sha256', 'bms_hmac_secret').update(search.toLowerCase().trim()).digest('base64');
      
      whereClause.OR = [
        { hmacName: searchHmac },
        { hmacCode: searchHmac },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      request.db!.item.findMany({
        where: whereClause,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      request.db!.item.count({ where: whereClause }),
    ]);

    let filteredItems = items;
    if (lowStock === 'true') {
      filteredItems = items.filter(
        (item) => item.type === ItemType.PRODUCT && Number(item.currentStock) <= Number(item.minStockAlert)
      );
    }

    return reply.send({
      success: true,
      data: filteredItems,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // ----------------------------------------------------
  // GET ITEM DETAILS & STOCK MOVEMENT AUDIT LOGS
  // ----------------------------------------------------
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = await request.db!.item.findFirst({
      where: { id, businessId: request.tenant!.businessId },
      include: {
        category: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: item,
    });
  });

  // ----------------------------------------------------
  // CREATE ITEM (Transaction-Safe Opening Stock Log)
  // ----------------------------------------------------
  fastify.post('/', async (request, reply) => {
    if (!request.tenant!.features.includes('INVENTORY_TRACKING')) {
      throw new AppError('Feature Locked: Upgrade your plan to manage inventory.', 403, 'FEATURE_LOCKED');
    }

    const body = itemSchema.parse(request.body);

    const item = await request.db!.$transaction(async (tx) => {
      const newItem = await tx.item.create({
        data: {
          businessId: request.tenant!.businessId,
          name: body.name,
          code: body.code || null,
          type: body.type,
          categoryId: body.categoryId || null,
          unit: body.unit,
          salePrice: body.salePrice,
          purchasePrice: body.purchasePrice,
          minStockAlert: body.minStockAlert,
          openingStock: body.openingStock,
          currentStock: body.openingStock,
          // E2EE Metadata
          encryptedDeks: body.encryptedDeks ? body.encryptedDeks : Prisma.JsonNull,
          iv: body.iv || null,
          encPurchasePrice: body.encPurchasePrice || null,
          encSalePrice: body.encSalePrice || null,
          hmacName: body.hmacName || null,
          hmacCode: body.hmacCode || null,
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      if (body.type === ItemType.PRODUCT && body.openingStock !== 0) {
        await tx.stockMovement.create({
          data: {
            businessId: request.tenant!.businessId,
            itemId: newItem.id,
            type: StockMovementType.INITIAL,
            quantity: body.openingStock,
            reference: 'Initial opening stock entry',
          },
        });
      }

      return newItem;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.status(201).send({
      success: true,
      data: item,
    });
  });

  // ----------------------------------------------------
  // UPDATE ITEM
  // ----------------------------------------------------
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateItemSchema.parse(request.body);

    const existing = await request.db!.item.findFirst({ where: { id, businessId: request.tenant!.businessId } });
    if (!existing) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const categoryId = body.categoryId === '' ? null : (body.categoryId !== undefined ? body.categoryId : existing.categoryId);
    const code = body.code === '' ? null : (body.code !== undefined ? body.code : existing.code);

    const updated = await request.db!.item.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        code,
        type: body.type ?? existing.type,
        categoryId,
        unit: body.unit ?? existing.unit,
        salePrice: body.salePrice ?? existing.salePrice,
        purchasePrice: body.purchasePrice ?? existing.purchasePrice,
        minStockAlert: body.minStockAlert ?? existing.minStockAlert,
        // E2EE Metadata
        encryptedDeks: body.encryptedDeks !== undefined ? (body.encryptedDeks ? body.encryptedDeks : Prisma.JsonNull) : existing.encryptedDeks,
        iv: body.iv !== undefined ? body.iv : existing.iv,
        encPurchasePrice: body.encPurchasePrice !== undefined ? body.encPurchasePrice : existing.encPurchasePrice,
        encSalePrice: body.encSalePrice !== undefined ? body.encSalePrice : existing.encSalePrice,
        hmacName: body.hmacName !== undefined ? body.hmacName : existing.hmacName,
        hmacCode: body.hmacCode !== undefined ? body.hmacCode : existing.hmacCode,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return reply.send({
      success: true,
      data: updated,
    });
  });

  // ----------------------------------------------------
  // MANUAL STOCK ADJUSTMENT (Transaction-Safe)
  // ----------------------------------------------------
  fastify.post('/:id/adjust', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = stockAdjustmentSchema.parse(request.body);

    const updatedItem = await request.db!.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id } });
      if (!item) {
        throw new AppError('Item not found', 404, 'NOT_FOUND');
      }

      if (item.type !== ItemType.PRODUCT) {
        throw new AppError('Cannot adjust stock for service items', 400, 'BAD_REQUEST');
      }

      const delta = body.adjustmentType === 'ADD' ? body.quantity : -body.quantity;
      const currentStockDecimal = new Prisma.Decimal(item.currentStock || 0);
      const newStockDecimal = currentStockDecimal.add(delta);

      const newItemRecord = await tx.item.update({
        where: { id },
        data: {
          currentStock: newStockDecimal,
        },
      });

      await tx.stockMovement.create({
        data: {
          businessId: request.tenant!.businessId,
          itemId: id,
          type: StockMovementType.ADJUSTMENT,
          quantity: delta,
          reference: body.notes || `Manual stock adjustment (${body.adjustmentType})`,
        },
      });

      return newItemRecord;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.send({
      success: true,
      data: updatedItem,
    });
  });

  // ----------------------------------------------------
  // DELETE ITEM
  // ----------------------------------------------------
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = await request.db!.item.findFirst({
      where: { id, businessId: request.tenant!.businessId },
      include: {
        _count: {
          select: {
            saleItems: true,
            purchaseItems: true,
          },
        },
      },
    });

    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const usageCount = item._count.saleItems + item._count.purchaseItems;
    if (usageCount > 0) {
      throw new AppError(
        `Cannot delete item "${item.name}" because it is linked to ${usageCount} transaction invoices/bills.`,
        400,
        'HAS_DEPENDENTS'
      );
    }

    await request.db!.$transaction([
      request.db!.stockMovement.deleteMany({ where: { itemId: id } }),
      request.db!.item.delete({ where: { id } }),
    ]);

    return reply.send({
      success: true,
      data: { message: 'Item deleted successfully' },
    });
  });
}

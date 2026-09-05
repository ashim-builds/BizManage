import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { itemSchema, updateItemSchema, stockAdjustmentSchema } from '@bizmanage/validation';
import { ItemType, StockMovementType, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';
import crypto from 'crypto';
import { z } from 'zod';

import {
  normalizeSearchQuery,
  extractSearchTokens,
  scoreItemRelevance,
} from './item-search.service.js';

export async function itemRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // GET INVENTORY SUMMARY (Total Stock Valuation & Low Stock Count)
  // ----------------------------------------------------
  fastify.get('/summary', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    try {
      const [totalCount, outOfStockCount, lowStockResult, aggregates] = await Promise.all([
        request.db!.item.count({
          where: { businessId, type: ItemType.PRODUCT },
        }),
        request.db!.item.count({
          where: { businessId, type: ItemType.PRODUCT, currentStock: { lte: 0 } },
        }),
        request.db!.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count FROM Item 
          WHERE businessId = ${businessId} 
            AND type = 'PRODUCT' 
            AND (currentStock <= minStockAlert OR currentStock <= 0)
        `,
        request.db!.$queryRaw<{ totalCostValuation: number | null; totalSaleValuation: number | null }[]>`
          SELECT 
            SUM(CASE WHEN currentStock > 0 THEN currentStock * purchasePrice ELSE 0 END) as totalCostValuation,
            SUM(CASE WHEN currentStock > 0 THEN currentStock * salePrice ELSE 0 END) as totalSaleValuation
          FROM Item 
          WHERE businessId = ${businessId} AND type = 'PRODUCT'
        `,
      ]);

      const lowStockCount = Number(lowStockResult[0]?.count || 0);
      const totalCostValuation = Number(aggregates[0]?.totalCostValuation || 0);
      const totalSaleValuation = Number(aggregates[0]?.totalSaleValuation || 0);

      return reply.send({
        success: true,
        data: {
          totalItems: totalCount,
          totalCostValuation,
          totalSaleValuation,
          lowStockCount,
          outOfStockCount,
        },
      });
    } catch (err: any) {
      request.log.error(err, 'Failed to fetch inventory summary');
      return reply.send({
        success: true,
        data: {
          totalItems: 0,
          totalCostValuation: 0,
          totalSaleValuation: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        },
      });
    }
  });

  // ----------------------------------------------------
  // LIST ITEMS WITH SMART SEARCH & SERVER-SIDE PAGINATION
  // ----------------------------------------------------
  fastify.get('/', async (request, reply) => {
    const {
      search,
      status,
      categoryId,
      type,
      lowStock,
      page = '1',
      limit = '25',
      sort = 'name',
      order = 'asc',
      dateFrom,
      dateTo,
    } = request.query as {
      search?: string;
      status?: string;
      categoryId?: string;
      type?: ItemType;
      lowStock?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: 'asc' | 'desc';
      dateFrom?: string;
      dateTo?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const businessId = request.tenant!.businessId;

    const whereClause: Prisma.ItemWhereInput = {
      businessId,
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

    // 1. Stock Status Filter (Processed at database level)
    const normalizedStatus = (status || (lowStock === 'true' ? 'low_stock' : '')).toLowerCase();
    if (normalizedStatus === 'low_stock' || normalizedStatus === 'low' || normalizedStatus === 'low-stock') {
      whereClause.type = ItemType.PRODUCT;
      try {
        const lowStockRowIds: { id: string }[] = await request.db!.$queryRaw`
          SELECT id FROM Item 
          WHERE businessId = ${businessId} 
            AND type = 'PRODUCT' 
            AND (currentStock <= minStockAlert OR currentStock <= 0)
        `;
        whereClause.id = { in: lowStockRowIds.map((r) => r.id) };
      } catch (e) {
        whereClause.currentStock = { lte: 0 };
      }
    } else if (normalizedStatus === 'out' || normalizedStatus === 'out_of_stock' || normalizedStatus === 'zero') {
      whereClause.type = ItemType.PRODUCT;
      whereClause.currentStock = { lte: 0 };
    } else if (normalizedStatus === 'in_stock') {
      whereClause.type = ItemType.PRODUCT;
      whereClause.currentStock = { gt: 0 };
    }

    // 2. Smart Search Query Filter
    const hasSearch = Boolean(search && search.trim());
    let tokensInfo: { primaryTokens: string[]; allCandidateTokens: string[] } = {
      primaryTokens: [],
      allCandidateTokens: [],
    };

    if (hasSearch) {
      const rawSearch = search!.trim();
      tokensInfo = extractSearchTokens(rawSearch);
      const normalizedQuery = normalizeSearchQuery(rawSearch);

      const searchHmac = crypto
        .createHmac('sha256', 'bms_hmac_secret')
        .update(rawSearch.toLowerCase())
        .digest('base64');

      const candidateOrs: Prisma.ItemWhereInput[] = [
        { hmacName: searchHmac },
        { hmacCode: searchHmac },
        { name: { contains: rawSearch } },
        { code: { contains: rawSearch } },
        { category: { name: { contains: rawSearch } } },
      ];

      if (normalizedQuery && normalizedQuery !== rawSearch.toLowerCase()) {
        candidateOrs.push({ name: { contains: normalizedQuery } });
      }

      // Add token matches
      for (const token of tokensInfo.allCandidateTokens) {
        if (token.length >= 2) {
          candidateOrs.push({ name: { contains: token } });
          candidateOrs.push({ code: { contains: token } });
        }
      }

      whereClause.OR = candidateOrs;
    }

    // 3. Database Sorting Map
    const sortField = sort === 'quantity' || sort === 'stock' ? 'currentStock' : sort === 'price' ? 'salePrice' : sort === 'createdAt' ? 'createdAt' : 'name';
    const sortOrder: 'asc' | 'desc' = order === 'desc' ? 'desc' : 'asc';
    const orderByClause: Prisma.ItemOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };

    try {
      if (hasSearch) {
        // Fetch matching candidate set for relevance ranking
        const [candidateItems, totalCount] = await Promise.all([
          request.db!.item.findMany({
            where: whereClause,
            include: {
              category: {
                select: { id: true, name: true },
              },
            },
            take: 300, // Fetch top candidate pool for ranking
          }),
          request.db!.item.count({ where: whereClause }),
        ]);

        // Score and sort by relevance
        const scoredItems = candidateItems.map((item) => ({
          item,
          score: scoreItemRelevance(item, search!, tokensInfo),
        }));

        scoredItems.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return a.item.name.localeCompare(b.item.name);
        });

        // Slice for requested page
        const pagedItems = scoredItems.slice(skip, skip + limitNum).map((s) => s.item);
        const total = totalCount;
        const totalPages = Math.ceil(total / limitNum) || 1;
        const hasMore = skip + pagedItems.length < total;

        const paginationMeta = {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore,
        };

        return reply.send({
          success: true,
          data: pagedItems,
          items: pagedItems,
          meta: paginationMeta,
          pagination: paginationMeta,
        });
      } else {
        // Standard fast paginated database query
        const [items, total] = await Promise.all([
          request.db!.item.findMany({
            where: whereClause,
            include: {
              category: {
                select: { id: true, name: true },
              },
            },
            orderBy: orderByClause,
            skip,
            take: limitNum,
          }),
          request.db!.item.count({ where: whereClause }),
        ]);

        const totalPages = Math.ceil(total / limitNum) || 1;
        const hasMore = skip + items.length < total;

        const paginationMeta = {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore,
        };

        return reply.send({
          success: true,
          data: items,
          items,
          meta: paginationMeta,
          pagination: paginationMeta,
        });
      }
    } catch (err: any) {
      request.log.error(err, 'Failed to fetch items');
      const emptyMeta = { page: pageNum, limit: limitNum, total: 0, totalPages: 1, hasMore: false };
      return reply.send({
        success: true,
        data: [],
        items: [],
        meta: emptyMeta,
        pagination: emptyMeta,
      });
    }
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
          take: 100,
        },
        saleItems: {
          include: {
            sale: {
              include: {
                party: true,
              },
            },
          },
          take: 100,
        },
        saleReturnItems: {
          include: {
            saleReturn: {
              include: {
                party: true,
              },
            },
          },
          take: 100,
        },
        purchaseItems: {
          include: {
            purchase: {
              include: {
                party: true,
              },
            },
          },
          take: 100,
        },
        purchaseReturnItems: {
          include: {
            purchaseReturn: {
              include: {
                party: true,
              },
            },
          },
          take: 100,
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
          wholesalePrice: body.wholesalePrice ?? 0,
          purchasePrice: body.purchasePrice,
          minStockAlert: body.minStockAlert,
          openingStock: body.openingStock,
          currentStock: body.openingStock,
          imageUrl: body.imageUrl || null,
          storeDescription: body.storeDescription || null,
          // E2EE Metadata
          encryptedDeks: body.encryptedDeks ? body.encryptedDeks : Prisma.JsonNull,
          iv: body.iv || null,
          encPurchasePrice: body.encPurchasePrice || null,
          encSalePrice: body.encSalePrice || null,
          encWholesalePrice: body.encWholesalePrice || null,
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
  // BULK CREATE ITEMS (High-Performance Batch Import)
  // ----------------------------------------------------
  fastify.post('/bulk', async (request, reply) => {
    if (!request.tenant!.features.includes('INVENTORY_TRACKING')) {
      throw new AppError('Feature Locked: Upgrade your plan to manage inventory.', 403, 'FEATURE_LOCKED');
    }

    const bulkSchema = z.object({
      items: z.array(
        itemSchema.extend({
          categoryName: z.string().optional().nullable(),
        })
      ),
    });

    const body = bulkSchema.parse(request.body);
    const businessId = request.tenant!.businessId;

    if (body.items.length === 0) {
      return reply.status(200).send({
        success: true,
        data: { createdCount: 0 },
      });
    }

    // 1. Pre-fetch and cache all existing categories for this tenant
    const existingCategories = await request.db!.itemCategory.findMany({
      where: { businessId },
      select: { id: true, name: true },
    });

    const categoryMap = new Map<string, string>();
    for (const cat of existingCategories) {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    }

    // 2. Identify distinct missing categories and create them upfront
    const missingCategoryNames = new Set<string>();
    for (const item of body.items) {
      if (!item.categoryId && item.categoryName && item.categoryName.trim()) {
        const norm = item.categoryName.trim().toLowerCase();
        if (!categoryMap.has(norm)) {
          missingCategoryNames.add(item.categoryName.trim());
        }
      }
    }

    for (const catName of missingCategoryNames) {
      const norm = catName.toLowerCase();
      if (!categoryMap.has(norm)) {
        const createdCat = await request.db!.itemCategory.upsert({
          where: {
            businessId_name: {
              businessId,
              name: catName,
            },
          },
          update: {},
          create: {
            businessId,
            name: catName,
          },
        });
        categoryMap.set(norm, createdCat.id);
      }
    }

    // 3. Prepare items and stock movements with pre-generated UUIDs
    const itemsToCreate: any[] = [];
    const stockMovementsToCreate: any[] = [];

    for (const itemInput of body.items) {
      let categoryId = itemInput.categoryId;
      if (!categoryId && itemInput.categoryName && itemInput.categoryName.trim()) {
        categoryId = categoryMap.get(itemInput.categoryName.trim().toLowerCase()) || null;
      }

      const itemId = crypto.randomUUID();
      const openingStock = Number(itemInput.openingStock ?? 0);

      itemsToCreate.push({
        id: itemId,
        businessId,
        name: itemInput.name,
        code: itemInput.code || null,
        type: itemInput.type,
        categoryId: categoryId || null,
        unit: itemInput.unit || 'Pcs',
        salePrice: new Prisma.Decimal(itemInput.salePrice ?? 0),
        wholesalePrice: new Prisma.Decimal(itemInput.wholesalePrice ?? 0),
        purchasePrice: new Prisma.Decimal(itemInput.purchasePrice ?? 0),
        minStockAlert: new Prisma.Decimal(itemInput.minStockAlert ?? 0),
        openingStock: new Prisma.Decimal(openingStock),
        currentStock: new Prisma.Decimal(openingStock),
        imageUrl: itemInput.imageUrl || null,
        storeDescription: itemInput.storeDescription || null,
        // E2EE Metadata
        encryptedDeks: itemInput.encryptedDeks ? itemInput.encryptedDeks : Prisma.JsonNull,
        iv: itemInput.iv || null,
        encPurchasePrice: itemInput.encPurchasePrice || null,
        encSalePrice: itemInput.encSalePrice || null,
        encWholesalePrice: itemInput.encWholesalePrice || null,
        hmacName: itemInput.hmacName || null,
        hmacCode: itemInput.hmacCode || null,
      });

      if (itemInput.type === ItemType.PRODUCT && openingStock !== 0) {
        stockMovementsToCreate.push({
          id: crypto.randomUUID(),
          businessId,
          itemId,
          type: StockMovementType.INITIAL,
          quantity: new Prisma.Decimal(openingStock),
          reference: 'Initial opening stock entry (bulk import)',
        });
      }
    }

    // 4. Batch insert in manageable chunks (e.g. 200 items per batch)
    const CHUNK_SIZE = 200;
    let createdCount = 0;

    for (let i = 0; i < itemsToCreate.length; i += CHUNK_SIZE) {
      const itemChunk = itemsToCreate.slice(i, i + CHUNK_SIZE);
      const itemIdsChunk = new Set(itemChunk.map((it) => it.id));
      const smChunk = stockMovementsToCreate.filter((sm) => itemIdsChunk.has(sm.itemId));

      await request.db!.$transaction(async (tx) => {
        await tx.item.createMany({
          data: itemChunk,
        });

        if (smChunk.length > 0) {
          await tx.stockMovement.createMany({
            data: smChunk,
          });
        }
      }, { maxWait: 15000, timeout: 30000 });

      createdCount += itemChunk.length;
    }

    return reply.status(201).send({
      success: true,
      data: { createdCount },
    });
  });

  // ----------------------------------------------------
  // BULK MOVE ITEMS TO CATEGORY
  // ----------------------------------------------------
  fastify.post('/bulk-move-category', async (request, reply) => {
    const bulkMoveSchema = z.object({
      itemIds: z.array(z.string()),
      categoryId: z.string().nullable().optional(),
    });

    const { itemIds, categoryId } = bulkMoveSchema.parse(request.body);

    if (itemIds.length === 0) {
      return reply.send({ success: true, data: { count: 0 } });
    }

    const result = await request.db!.item.updateMany({
      where: {
        id: { in: itemIds },
        businessId: request.tenant!.businessId,
      },
      data: {
        categoryId: categoryId || null,
      },
    });

    return reply.send({
      success: true,
      data: { count: result.count },
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
        wholesalePrice: body.wholesalePrice !== undefined ? body.wholesalePrice : existing.wholesalePrice,
        purchasePrice: body.purchasePrice ?? existing.purchasePrice,
        minStockAlert: body.minStockAlert ?? existing.minStockAlert,
        imageUrl: body.imageUrl !== undefined ? (body.imageUrl || null) : existing.imageUrl,
        storeDescription: body.storeDescription !== undefined ? (body.storeDescription || null) : existing.storeDescription,
        // E2EE Metadata
        encryptedDeks: body.encryptedDeks !== undefined 
          ? (body.encryptedDeks ? body.encryptedDeks : Prisma.JsonNull) 
          : undefined,
        iv: body.iv !== undefined ? body.iv : undefined,
        encPurchasePrice: body.encPurchasePrice !== undefined ? body.encPurchasePrice : undefined,
        encSalePrice: body.encSalePrice !== undefined ? body.encSalePrice : undefined,
        encWholesalePrice: body.encWholesalePrice !== undefined ? body.encWholesalePrice : undefined,
        hmacName: body.hmacName !== undefined ? body.hmacName : undefined,
        hmacCode: body.hmacCode !== undefined ? body.hmacCode : undefined,
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

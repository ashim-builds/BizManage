import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { AppError } from '../../plugins/error-handler.js';
import { z } from 'zod';
import { Prisma } from '@bizmanage/database';

const createGodownSchema = z.object({
  name: z.string().min(1, 'Godown name is required'),
  location: z.string().optional().nullable(),
  capacity: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

const updateGodownSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional().nullable(),
  capacity: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

const stockTransferSchema = z.object({
  sourceGodownId: z.string().uuid('Invalid source godown ID'),
  destinationGodownId: z.string().uuid('Invalid destination godown ID'),
  itemId: z.string().uuid('Invalid item ID'),
  quantity: z.number().positive('Transfer quantity must be greater than 0'),
  notes: z.string().optional().nullable(),
  transferDate: z.string().datetime().or(z.date()).optional(),
});

export async function godownRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // GET /godowns - List all godowns for current business
  fastify.get('/', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    const godowns = await request.db!.godown.findMany({
      where: { businessId },
      include: {
        stocks: {
          include: {
            item: {
              select: { id: true, name: true, code: true, unit: true, salePrice: true, purchasePrice: true },
            },
          },
        },
        _count: {
          select: {
            stocks: true,
            sourceTransfers: true,
            destTransfers: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Compute summary stats
    const formatted = godowns.map((g) => {
      const totalUnits = g.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
      const totalStockValue = g.stocks.reduce(
        (sum, s) => sum + Number(s.quantity) * Number(s.item.purchasePrice || 0),
        0
      );

      return {
        id: g.id,
        name: g.name,
        location: g.location,
        capacity: g.capacity,
        isDefault: g.isDefault,
        totalItemsCount: g.stocks.length,
        totalUnits,
        totalStockValue,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      };
    });

    return reply.send({ success: true, data: formatted });
  });

  // POST /godowns - Create Godown
  fastify.post('/', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const body = createGodownSchema.parse(request.body);

    // If marked default, unset existing default
    if (body.isDefault) {
      await request.db!.godown.updateMany({
        where: { businessId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const existing = await request.db!.godown.findFirst({
      where: { businessId, name: body.name },
    });

    if (existing) {
      throw new AppError(`Godown "${body.name}" already exists`, 400, 'DUPLICATE_RESOURCE');
    }

    const godown = await request.db!.godown.create({
      data: {
        businessId,
        name: body.name,
        location: body.location,
        capacity: body.capacity,
        isDefault: body.isDefault || false,
      },
    });

    return reply.status(201).send({ success: true, data: godown });
  });

  // GET /godowns/:id/stocks - Get stock details inside a Godown
  fastify.get('/:id/stocks', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { id } = request.params as { id: string };

    const godown = await request.db!.godown.findFirst({
      where: { id, businessId },
    });

    if (!godown) {
      throw new AppError('Godown not found', 404, 'NOT_FOUND');
    }

    const stocks = await request.db!.godownStock.findMany({
      where: { godownId: id, businessId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            currentStock: true,
            purchasePrice: true,
            salePrice: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: {
        godown,
        stocks: stocks.map((s) => ({
          id: s.id,
          itemId: s.itemId,
          itemName: s.item.name,
          itemCode: s.item.code,
          unit: s.item.unit,
          quantity: Number(s.quantity),
          purchasePrice: Number(s.item.purchasePrice || 0),
          salePrice: Number(s.item.salePrice || 0),
          stockValue: Number(s.quantity) * Number(s.item.purchasePrice || 0),
          totalItemStock: Number(s.item.currentStock),
        })),
      },
    });
  });

  // PUT /godowns/:id - Update Godown
  fastify.put('/:id', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { id } = request.params as { id: string };
    const body = updateGodownSchema.parse(request.body);

    const godown = await request.db!.godown.findFirst({
      where: { id, businessId },
    });

    if (!godown) {
      throw new AppError('Godown not found', 404, 'NOT_FOUND');
    }

    if (body.isDefault) {
      await request.db!.godown.updateMany({
        where: { businessId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await request.db!.godown.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // DELETE /godowns/:id - Delete Godown
  fastify.delete('/:id', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { id } = request.params as { id: string };

    const godown = await request.db!.godown.findFirst({
      where: { id, businessId },
      include: {
        stocks: {
          where: { quantity: { gt: 0 } },
        },
      },
    });

    if (!godown) {
      throw new AppError('Godown not found', 404, 'NOT_FOUND');
    }

    if (godown.stocks.length > 0) {
      throw new AppError(
        'Cannot delete godown that still holds active stock. Transfer or adjust stock first.',
        400,
        'ACTIVE_STOCK_EXISTS'
      );
    }

    await request.db!.godown.delete({
      where: { id },
    });

    return reply.send({ success: true, message: 'Godown deleted successfully' });
  });

  // POST /godowns/transfers - Execute Stock Transfer
  fastify.post('/transfers', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const body = stockTransferSchema.parse(request.body);

    if (body.sourceGodownId === body.destinationGodownId) {
      throw new AppError('Source and destination godown cannot be identical', 400, 'VALIDATION_ERROR');
    }

    const [sourceGodown, destGodown, item] = await Promise.all([
      request.db!.godown.findFirst({ where: { id: body.sourceGodownId, businessId } }),
      request.db!.godown.findFirst({ where: { id: body.destinationGodownId, businessId } }),
      request.db!.item.findFirst({ where: { id: body.itemId, businessId } }),
    ]);

    if (!sourceGodown) throw new AppError('Source godown not found', 404, 'NOT_FOUND');
    if (!destGodown) throw new AppError('Destination godown not found', 404, 'NOT_FOUND');
    if (!item) throw new AppError('Item not found', 404, 'NOT_FOUND');

    const sourceStock = await request.db!.godownStock.findUnique({
      where: {
        godownId_itemId: {
          godownId: body.sourceGodownId,
          itemId: body.itemId,
        },
      },
    });

    const currentQty = sourceStock ? Number(sourceStock.quantity) : 0;
    if (currentQty < body.quantity) {
      throw new AppError(
        `Insufficient stock in ${sourceGodown.name}. Available: ${currentQty} ${item.unit}, Requested: ${body.quantity} ${item.unit}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    // Generate transfer number
    const count = await request.db!.stockTransfer.count({ where: { businessId } });
    const transferNumber = `TRF-${String(count + 1).padStart(5, '0')}`;

    const result = await request.db!.$transaction(async (tx) => {
      // 1. Deduct source godown stock
      await tx.godownStock.update({
        where: {
          godownId_itemId: {
            godownId: body.sourceGodownId,
            itemId: body.itemId,
          },
        },
        data: {
          quantity: {
            decrement: new Prisma.Decimal(body.quantity),
          },
        },
      });

      // 2. Add destination godown stock (upsert)
      await tx.godownStock.upsert({
        where: {
          godownId_itemId: {
            godownId: body.destinationGodownId,
            itemId: body.itemId,
          },
        },
        create: {
          businessId,
          godownId: body.destinationGodownId,
          itemId: body.itemId,
          quantity: new Prisma.Decimal(body.quantity),
        },
        update: {
          quantity: {
            increment: new Prisma.Decimal(body.quantity),
          },
        },
      });

      // 3. Create transfer record
      const transfer = await tx.stockTransfer.create({
        data: {
          businessId,
          transferNumber,
          sourceGodownId: body.sourceGodownId,
          destinationGodownId: body.destinationGodownId,
          itemId: body.itemId,
          quantity: new Prisma.Decimal(body.quantity),
          notes: body.notes,
          transferDate: body.transferDate ? new Date(body.transferDate) : new Date(),
        },
        include: {
          sourceGodown: { select: { name: true } },
          destinationGodown: { select: { name: true } },
          item: { select: { name: true, code: true, unit: true } },
        },
      });

      // 4. Log stock movement
      await tx.stockMovement.create({
        data: {
          businessId,
          itemId: body.itemId,
          type: 'TRANSFER',
          quantity: new Prisma.Decimal(body.quantity),
          reference: `${transferNumber}: ${sourceGodown.name} -> ${destGodown.name}`,
        },
      });

      return transfer;
    });

    return reply.status(201).send({ success: true, data: result });
  });

  // GET /godowns/transfers - List transfer history
  fastify.get('/transfers', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { page = '1', limit = '50' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transfers, total] = await Promise.all([
      request.db!.stockTransfer.findMany({
        where: { businessId },
        include: {
          sourceGodown: { select: { id: true, name: true } },
          destinationGodown: { select: { id: true, name: true } },
          item: { select: { id: true, name: true, code: true, unit: true } },
        },
        orderBy: { transferDate: 'desc' },
        skip,
        take: limitNum,
      }),
      request.db!.stockTransfer.count({ where: { businessId } }),
    ]);

    return reply.send({
      success: true,
      data: transfers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });
}

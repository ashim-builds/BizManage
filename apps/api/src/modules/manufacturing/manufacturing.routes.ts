import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { AppError } from '../../plugins/error-handler.js';
import { z } from 'zod';
import { Prisma } from '@bizmanage/database';

const bomComponentSchema = z.object({
  itemId: z.string().uuid('Invalid component item ID'),
  quantity: z.number().positive('Component quantity must be greater than 0'),
  unitCost: z.number().nonnegative().optional().default(0),
});

const createBomSchema = z.object({
  name: z.string().min(1, 'BOM name is required'),
  finishedItemId: z.string().uuid('Invalid finished item ID'),
  outputQuantity: z.number().positive('Output quantity must be greater than 0').default(1),
  sourceGodownId: z.string().uuid().optional().nullable(),
  targetGodownId: z.string().uuid().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional().default(0),
  notes: z.string().optional().nullable(),
  components: z.array(bomComponentSchema).min(1, 'At least one raw material component is required'),
});

const updateBomSchema = z.object({
  name: z.string().min(1).optional(),
  outputQuantity: z.number().positive().optional(),
  sourceGodownId: z.string().uuid().optional().nullable(),
  targetGodownId: z.string().uuid().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  components: z.array(bomComponentSchema).min(1).optional(),
});

const executeRunSchema = z.object({
  bomId: z.string().uuid('Invalid BOM ID'),
  quantityProduced: z.number().positive('Produced quantity must be greater than 0'),
  sourceGodownId: z.string().uuid().optional().nullable(),
  destinationGodownId: z.string().uuid().optional().nullable(),
  runDate: z.string().datetime().or(z.date()).optional(),
  notes: z.string().optional().nullable(),
});

export async function manufacturingRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ── BOM ENDPOINTS ─────────────────────────────────────────────────────────

  // GET /manufacturing/boms - List all BOMs
  fastify.get('/boms', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    const boms = await request.db!.billOfMaterial.findMany({
      where: { businessId },
      include: {
        finishedItem: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            currentStock: true,
            salePrice: true,
            purchasePrice: true,
          },
        },
        defaultGodown: {
          select: { id: true, name: true },
        },
        components: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                currentStock: true,
                purchasePrice: true,
              },
            },
          },
        },
        _count: {
          select: { productionRuns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ success: true, data: boms });
  });

  // GET /manufacturing/boms/:id - Get single BOM
  fastify.get('/boms/:id', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { id } = request.params as { id: string };

    const bom = await request.db!.billOfMaterial.findFirst({
      where: { id, businessId },
      include: {
        finishedItem: true,
        defaultGodown: true,
        components: {
          include: {
            item: true,
          },
        },
        productionRuns: {
          orderBy: { runDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!bom) {
      throw new AppError('Bill of Material not found', 404, 'NOT_FOUND');
    }

    return reply.send({ success: true, data: bom });
  });

  // POST /manufacturing/boms - Create BOM
  fastify.post('/boms', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const body = createBomSchema.parse(request.body);

    const finishedItem = await request.db!.item.findFirst({
      where: { id: body.finishedItemId, businessId },
    });

    if (!finishedItem) {
      throw new AppError('Finished product item not found', 404, 'NOT_FOUND');
    }

    // Verify all component items exist
    const componentItemIds = body.components.map((c) => c.itemId);
    const existingItems = await request.db!.item.findMany({
      where: { id: { in: componentItemIds }, businessId },
    });

    if (existingItems.length !== componentItemIds.length) {
      throw new AppError('One or more component items do not exist', 400, 'VALIDATION_ERROR');
    }

    // Calculate estimated total cost
    let calculatedCost = 0;
    const itemMap = new Map(existingItems.map((i) => [i.id, i]));
    for (const comp of body.components) {
      const itm = itemMap.get(comp.itemId);
      const unitCost = comp.unitCost > 0 ? comp.unitCost : Number(itm?.purchasePrice || 0);
      calculatedCost += comp.quantity * unitCost;
    }

    const bom = await request.db!.billOfMaterial.create({
      data: {
        businessId,
        name: body.name,
        finishedItemId: body.finishedItemId,
        outputQuantity: new Prisma.Decimal(body.outputQuantity),
        sourceGodownId: body.sourceGodownId || null,
        targetGodownId: body.targetGodownId || null,
        estimatedCost: new Prisma.Decimal(body.estimatedCost > 0 ? body.estimatedCost : calculatedCost),
        notes: body.notes || null,
        components: {
          create: body.components.map((c) => ({
            itemId: c.itemId,
            quantity: new Prisma.Decimal(c.quantity),
            unitCost: new Prisma.Decimal(
              c.unitCost > 0 ? c.unitCost : Number(itemMap.get(c.itemId)?.purchasePrice || 0)
            ),
          })),
        },
      },
      include: {
        finishedItem: { select: { name: true, code: true, unit: true } },
        components: {
          include: {
            item: { select: { name: true, code: true, unit: true } },
          },
        },
      },
    });

    return reply.status(201).send({ success: true, data: bom });
  });

  // PUT /manufacturing/boms/:id - Update BOM
  fastify.put('/boms/:id', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { id } = request.params as { id: string };
    const body = updateBomSchema.parse(request.body);

    const existingBom = await request.db!.billOfMaterial.findFirst({
      where: { id, businessId },
    });

    if (!existingBom) {
      throw new AppError('BOM not found', 404, 'NOT_FOUND');
    }

    const updated = await request.db!.$transaction(async (tx) => {
      if (body.components) {
        await tx.bOMComponent.deleteMany({ where: { bomId: id } });
        await tx.bOMComponent.createMany({
          data: body.components.map((c) => ({
            bomId: id,
            itemId: c.itemId,
            quantity: new Prisma.Decimal(c.quantity),
            unitCost: new Prisma.Decimal(c.unitCost || 0),
          })),
        });
      }

      return tx.billOfMaterial.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.outputQuantity !== undefined
            ? { outputQuantity: new Prisma.Decimal(body.outputQuantity) }
            : {}),
          ...(body.sourceGodownId !== undefined ? { sourceGodownId: body.sourceGodownId } : {}),
          ...(body.targetGodownId !== undefined ? { targetGodownId: body.targetGodownId } : {}),
          ...(body.estimatedCost !== undefined
            ? { estimatedCost: new Prisma.Decimal(body.estimatedCost) }
            : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
        include: {
          finishedItem: true,
          components: { include: { item: true } },
        },
      });
    });

    return reply.send({ success: true, data: updated });
  });

  // DELETE /manufacturing/boms/:id - Delete BOM
  fastify.delete('/boms/:id', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { id } = request.params as { id: string };

    const bom = await request.db!.billOfMaterial.findFirst({
      where: { id, businessId },
      include: {
        _count: { select: { productionRuns: true } },
      },
    });

    if (!bom) {
      throw new AppError('BOM not found', 404, 'NOT_FOUND');
    }

    if (bom._count.productionRuns > 0) {
      throw new AppError(
        'Cannot delete BOM that has existing production run history.',
        400,
        'HAS_PRODUCTION_HISTORY'
      );
    }

    await request.db!.$transaction(async (tx) => {
      await tx.bOMComponent.deleteMany({ where: { bomId: id } });
      await tx.billOfMaterial.delete({ where: { id } });
    });

    return reply.send({ success: true, message: 'BOM deleted successfully' });
  });

  // ── PRODUCTION RUNS ───────────────────────────────────────────────────────

  // GET /manufacturing/runs - List Production Runs
  fastify.get('/runs', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const { page = '1', limit = '50' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [runs, total] = await Promise.all([
      request.db!.productionRun.findMany({
        where: { businessId },
        include: {
          bom: { select: { id: true, name: true } },
          finishedItem: { select: { id: true, name: true, code: true, unit: true } },
          sourceGodown: { select: { id: true, name: true } },
          destinationGodown: { select: { id: true, name: true } },
        },
        orderBy: { runDate: 'desc' },
        skip,
        take: limitNum,
      }),
      request.db!.productionRun.count({ where: { businessId } }),
    ]);

    return reply.send({
      success: true,
      data: runs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // POST /manufacturing/runs - Execute Production Run
  fastify.post('/runs', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const body = executeRunSchema.parse(request.body);

    const bom = await request.db!.billOfMaterial.findFirst({
      where: { id: body.bomId, businessId },
      include: {
        components: {
          include: { item: true },
        },
        finishedItem: true,
      },
    });

    if (!bom) {
      throw new AppError('BOM not found', 404, 'NOT_FOUND');
    }

    const sourceGodownId = body.sourceGodownId || bom.sourceGodownId;
    const destinationGodownId = body.destinationGodownId || bom.targetGodownId;

    // Multiplier for batch size
    const multiplier = body.quantityProduced / Number(bom.outputQuantity);

    // Check raw materials availability
    let calculatedTotalCost = 0;
    for (const comp of bom.components) {
      const requiredQty = Number(comp.quantity) * multiplier;
      const compCost = Number(comp.unitCost) > 0 ? Number(comp.unitCost) : Number(comp.item.purchasePrice || 0);
      calculatedTotalCost += requiredQty * compCost;

      if (sourceGodownId) {
        const gStock = await request.db!.godownStock.findUnique({
          where: {
            godownId_itemId: {
              godownId: sourceGodownId,
              itemId: comp.itemId,
            },
          },
        });
        const availableQty = gStock ? Number(gStock.quantity) : 0;
        if (availableQty < requiredQty) {
          throw new AppError(
            `Insufficient raw material "${comp.item.name}" in source godown. Required: ${requiredQty} ${comp.item.unit}, Available: ${availableQty} ${comp.item.unit}`,
            400,
            'INSUFFICIENT_RAW_MATERIAL'
          );
        }
      } else {
        if (Number(comp.item.currentStock) < requiredQty) {
          throw new AppError(
            `Insufficient raw material "${comp.item.name}" in total inventory. Required: ${requiredQty} ${comp.item.unit}, Current: ${comp.item.currentStock} ${comp.item.unit}`,
            400,
            'INSUFFICIENT_RAW_MATERIAL'
          );
        }
      }
    }

    // Generate run number
    const count = await request.db!.productionRun.count({ where: { businessId } });
    const runNumber = `MFG-${String(count + 1).padStart(5, '0')}`;

    const result = await request.db!.$transaction(async (tx) => {
      // 1. Deduct raw materials
      for (const comp of bom.components) {
        const requiredQty = Number(comp.quantity) * multiplier;

        // Decrement Item general stock
        await tx.item.update({
          where: { id: comp.itemId },
          data: {
            currentStock: {
              decrement: new Prisma.Decimal(requiredQty),
            },
          },
        });

        // Decrement Godown stock if source godown is used
        if (sourceGodownId) {
          await tx.godownStock.update({
            where: {
              godownId_itemId: {
                godownId: sourceGodownId,
                itemId: comp.itemId,
              },
            },
            data: {
              quantity: {
                decrement: new Prisma.Decimal(requiredQty),
              },
            },
          });
        }

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            businessId,
            itemId: comp.itemId,
            type: 'MANUFACTURING',
            quantity: new Prisma.Decimal(requiredQty),
            reference: `${runNumber}: Consumed for producing ${body.quantityProduced} ${bom.finishedItem.unit} of ${bom.finishedItem.name}`,
          },
        });
      }

      // 2. Increment finished item
      await tx.item.update({
        where: { id: bom.finishedItemId },
        data: {
          currentStock: {
            increment: new Prisma.Decimal(body.quantityProduced),
          },
        },
      });

      // Upsert finished item in destination godown
      if (destinationGodownId) {
        await tx.godownStock.upsert({
          where: {
            godownId_itemId: {
              godownId: destinationGodownId,
              itemId: bom.finishedItemId,
            },
          },
          create: {
            businessId,
            godownId: destinationGodownId,
            itemId: bom.finishedItemId,
            quantity: new Prisma.Decimal(body.quantityProduced),
          },
          update: {
            quantity: {
              increment: new Prisma.Decimal(body.quantityProduced),
            },
          },
        });
      }

      // Record finished item stock movement
      await tx.stockMovement.create({
        data: {
          businessId,
          itemId: bom.finishedItemId,
          type: 'MANUFACTURING',
          quantity: new Prisma.Decimal(body.quantityProduced),
          reference: `${runNumber}: Manufactured via BOM [${bom.name}]`,
        },
      });

      // 3. Create ProductionRun record
      const run = await tx.productionRun.create({
        data: {
          businessId,
          runNumber,
          bomId: bom.id,
          finishedItemId: bom.finishedItemId,
          quantityProduced: new Prisma.Decimal(body.quantityProduced),
          sourceGodownId: sourceGodownId || null,
          destinationGodownId: destinationGodownId || null,
          totalCost: new Prisma.Decimal(calculatedTotalCost),
          notes: body.notes || null,
          runDate: body.runDate ? new Date(body.runDate) : new Date(),
        },
        include: {
          bom: { select: { name: true } },
          finishedItem: { select: { name: true, code: true, unit: true } },
          sourceGodown: { select: { name: true } },
          destinationGodown: { select: { name: true } },
        },
      });

      return run;
    });

    return reply.status(201).send({ success: true, data: result });
  });
}

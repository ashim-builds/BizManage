import { FastifyInstance } from 'fastify';
import { globalPrisma } from '@bizmanage/database';
import { z } from 'zod';

export async function auditRoutes(fastify: FastifyInstance) {
  // Protect all routes in this plugin with authentication
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
  });

  // GET /api/v1/audit-logs
  fastify.get('/', async (request, reply) => {
    const querySchema = z.object({
      module: z.string().optional(),
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    });

    const { module: moduleFilter, search, page, limit } = querySchema.parse(request.query);

    // Header business context
    const headerBusinessId = request.headers['x-business-id'] as string | undefined;
    const businessId = headerBusinessId || (request.user as any)?.businessId;

    if (!businessId) {
      return reply.status(400).send({
        success: false,
        error: 'BUSINESS_REQUIRED',
        message: 'Business context header X-Business-Id is required.',
      });
    }

    const where: any = { businessId };

    if (moduleFilter && moduleFilter.trim() !== '' && moduleFilter !== 'ALL') {
      where.module = { equals: moduleFilter.trim(), mode: 'insensitive' };
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { module: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      globalPrisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      globalPrisma.auditLog.count({ where }),
    ]);

    // Summary counts for dashboard header
    const [salesCount, purchasesCount, inventoryCount, financialCount] = await Promise.all([
      globalPrisma.auditLog.count({ where: { businessId, module: { in: ['Sale', 'SaleReturn', 'Sales'] } } }),
      globalPrisma.auditLog.count({ where: { businessId, module: { in: ['Purchase', 'PurchaseReturn', 'Purchases'] } } }),
      globalPrisma.auditLog.count({ where: { businessId, module: { in: ['Item', 'StockMovement', 'Inventory'] } } }),
      globalPrisma.auditLog.count({ where: { businessId, module: { in: ['Payment', 'Expense', 'Income', 'Account'] } } }),
    ]);

    return reply.send({
      success: true,
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        summary: {
          totalEvents: total,
          salesCount,
          purchasesCount,
          inventoryCount,
          financialCount,
        },
      },
    });
  });
}

import { FastifyInstance } from 'fastify';
import { requireBusinessTenant, requireRole } from '../../middleware/auth.js';
import { Prisma } from '@bizmanage/database';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // List audit logs for current active tenant business (Restricted to OWNER / ADMIN)
  fastify.get('/', { preHandler: [requireRole('OWNER', 'ADMIN')] }, async (request, reply) => {
    const { module, action, userId, startDate, endDate, page = '1', limit = '50' } = request.query as {
      module?: string;
      action?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.AuditLogWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (module) {
      whereClause.module = module;
    }

    if (action) {
      whereClause.action = action;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      request.db!.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      request.db!.auditLog.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: logs,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });
}

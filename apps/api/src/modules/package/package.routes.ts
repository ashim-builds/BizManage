import { FastifyInstance } from 'fastify';
import { globalPrisma } from '@bizmanage/database';

export async function publicPackageRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const packages = await globalPrisma.subscriptionPackage.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return reply.send({ success: true, data: packages });
  });
}

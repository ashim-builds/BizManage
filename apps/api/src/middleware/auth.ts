import { FastifyReply, FastifyRequest } from 'fastify';
import { globalPrisma, createTenantClient } from '@bizmanage/database';
import { AppError } from '../plugins/error-handler.js';
import { Role } from '@bizmanage/types';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: {
      businessId: string;
    };
    membership?: {
      role: Role;
    };
    db?: ReturnType<typeof createTenantClient>;
  }
}

export async function authenticateUser(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401, 'UNAUTHORIZED');
    }

    const payload = await request.jwtVerify<{ userId: string; email: string }>();
    const user = await globalPrisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    request.user = user;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
  }
}

export async function requireBusinessTenant(request: FastifyRequest, _reply: FastifyReply) {
  await authenticateUser(request, _reply);

  const businessId = request.headers['x-business-id'] as string;
  if (!businessId) {
    throw new AppError('Missing X-Business-Id header', 400, 'VALIDATION_ERROR');
  }

  const membership = await globalPrisma.userBusinessRole.findUnique({
    where: {
      userId_businessId: {
        userId: request.user.id,
        businessId,
      },
    },
  });

  if (!membership) {
    throw new AppError('Access denied for this business tenant', 403, 'FORBIDDEN');
  }

  request.tenant = { businessId };
  request.membership = { role: membership.role as Role };
  request.db = createTenantClient(businessId);
}

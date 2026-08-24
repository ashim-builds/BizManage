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
      isSystemAdmin: boolean;
    };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: {
      businessId: string;
      features: string[];
      isExpired?: boolean;
    };
    membership?: {
      role: Role;
    };
    db?: ReturnType<typeof createTenantClient>;
  }
}

export async function authenticateUser(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<{ userId: string; email: string }>();
    const user = await globalPrisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, isSystemAdmin: true },
    });

    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      isSystemAdmin: user.isSystemAdmin,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
  }
}

export async function requireBusinessTenant(request: FastifyRequest, _reply: FastifyReply) {
  await authenticateUser(request, _reply);

  let businessId = request.headers['x-business-id'] as string;
  if (!businessId) {
    const dbUser = await globalPrisma.user.findUnique({
      where: { id: request.user.id },
      select: { activeBusinessId: true, memberships: { select: { businessId: true }, take: 1 } },
    });
    businessId = dbUser?.activeBusinessId || dbUser?.memberships?.[0]?.businessId || '';
  }

  if (!businessId) {
    throw new AppError('No active business tenant found for this account', 400, 'VALIDATION_ERROR');
  }

  const membership = await globalPrisma.userBusinessRole.findUnique({
    where: {
      userId_businessId: {
        userId: request.user.id,
        businessId,
      },
    },
    include: {
      business: {
        select: { 
          isActive: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          subscriptionPackage: {
            select: { features: true }
          }
        },
      },
    },
  });

  if (!membership) {
    throw new AppError('Access denied for this business tenant', 403, 'FORBIDDEN');
  }

  if (!membership.business.isActive) {
    throw new AppError('Your business account has been suspended. Please contact the administrator.', 403, 'FORBIDDEN');
  }

  let isExpired = false;
  if (membership.business.subscriptionStatus === 'EXPIRED') {
    isExpired = true;
  } else if (membership.business.currentPeriodEnd && new Date(membership.business.currentPeriodEnd) < new Date()) {
    isExpired = true;
  }

  request.tenant = { 
    businessId,
    features: (membership.business.subscriptionPackage?.features as string[]) || [],
    isExpired
  };
  request.membership = { role: membership.role as Role };
  request.db = createTenantClient(businessId, request.user.id, request.ip);
}

export async function requireSystemAdmin(request: FastifyRequest, _reply: FastifyReply) {
  await authenticateUser(request, _reply);

  if (!request.user.isSystemAdmin) {
    throw new AppError('System Admin privileges required', 403, 'FORBIDDEN');
  }
}

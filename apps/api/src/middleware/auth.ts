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

export function requireRole(...allowedRoles: Role[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    if (!request.membership || !allowedRoles.includes(request.membership.role)) {
      throw new AppError(
        `Insufficient permissions. Role '${request.membership?.role || 'UNKNOWN'}' is not authorized for this action.`,
        403,
        'FORBIDDEN'
      );
    }
  };
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:[^\s'"]*/gi, '');
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      cleaned[key] = sanitizeInput(value);
    }
    return cleaned;
  }
  return input;
}

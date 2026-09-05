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
  let membership = businessId
    ? await globalPrisma.userBusinessRole.findUnique({
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
      })
    : null;

  if (!membership) {
    // Fallback to user's active or primary business membership
    const userRole = await globalPrisma.userBusinessRole.findFirst({
      where: { userId: request.user.id },
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

    if (userRole) {
      membership = userRole;
      businessId = userRole.businessId;
      globalPrisma.user.update({
        where: { id: request.user.id },
        data: { activeBusinessId: businessId },
      }).catch(() => {});
    }
  }

  if (!membership || !businessId) {
    throw new AppError('No active business tenant found for this account', 400, 'VALIDATION_ERROR');
  }

  if (!membership.business.isActive) {
    throw new AppError('Your business account has been suspended. Please contact the administrator.', 403, 'FORBIDDEN');
  }

  const now = new Date();
  const createdAt = (membership.business as any).createdAt ? new Date((membership.business as any).createdAt) : now;
  const trialEndsAt = (membership.business as any).trialEndsAt 
    ? new Date((membership.business as any).trialEndsAt) 
    : new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
  const isTrialActive = now < trialEndsAt;

  let isExpired = false;
  if (!isTrialActive) {
    if (membership.business.subscriptionStatus === 'EXPIRED') {
      isExpired = true;
    } else if (membership.business.currentPeriodEnd && new Date(membership.business.currentPeriodEnd) < now) {
      isExpired = true;
    }
  }

  const allFeatures = [
    'SALES_INVOICE', 'POS', 'POS_BILLING', 'PAYMENT_IN', 'SALES_RETURN',
    'PURCHASE_BILL', 'PAYMENT_OUT', 'EXPENSES', 'PURCHASE_RETURN',
    'INVENTORY', 'INVENTORY_TRACKING', 'GODOWNS', 'MULTI_GODOWN', 'BARCODE', 'BARCODE_PRINTING', 'MANUFACTURING',
    'PARTIES', 'MARKETING_WHATSAPP', 'WHATSAPP_MARKETING', 'ONLINE_STORE', 'EXPLORE_STORES',
    'ACCOUNTS', 'CASHFLOW', 'PROFIT_LOSS', 'REPORTS', 'ADVANCED_REPORTS', 'STAFF', 'MULTI_USER_ROLES', 'SETTINGS',
    'CUSTOM_BRANDING', 'CUSTOM_LOGO'
  ];

  const defaultStarterFeatures = [
    'COMPLETE_ACCOUNTING',
    'INVENTORY_TRACKING',
    'AUTO_LEDGER',
    'WALLET_SYNC',
    'E2E_ENCRYPTION',
    'SALES_INVOICE',
    'PAYMENT_IN',
    'PURCHASE_BILL',
    'PAYMENT_OUT',
    'EXPENSES',
    'PARTIES',
    'ACCOUNTS',
    'SETTINGS'
  ];

  let activeFeatures: string[] = [];
  if (isTrialActive) {
    activeFeatures = allFeatures;
  } else {
    const rawPkgFeatures = membership.business.subscriptionPackage?.features;
    if (typeof rawPkgFeatures === 'string') {
      try {
        activeFeatures = JSON.parse(rawPkgFeatures);
      } catch {
        activeFeatures = defaultStarterFeatures;
      }
    } else if (Array.isArray(rawPkgFeatures)) {
      activeFeatures = rawPkgFeatures.map(String);
    } else {
      activeFeatures = defaultStarterFeatures;
    }
  }

  request.tenant = { 
    businessId,
    features: activeFeatures,
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

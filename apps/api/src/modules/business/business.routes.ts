import { FastifyInstance } from 'fastify';
import { requireBusinessTenant, authenticateUser } from '../../middleware/auth.js';
import { createBusinessSchema, updateBusinessSchema, updateBusinessSettingsSchema } from '@bizmanage/validation';
import { globalPrisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';

export async function businessRoutes(fastify: FastifyInstance) {
  // List user businesses
  fastify.get('/', { preHandler: [authenticateUser] }, async (request, reply) => {
    const memberships = await globalPrisma.userBusinessRole.findMany({
      where: { userId: request.user!.id },
      include: { business: true },
    });

    return reply.send({
      success: true,
      data: memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        role: m.role,
        currency: m.business.currency,
      })),
    });
  });

  // Create new business
  fastify.post('/', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = createBusinessSchema.parse(request.body);

    const business = await globalPrisma.$transaction(async (tx) => {
      const biz = await tx.business.create({
        data: {
          name: body.name,
          phone: body.phone,
          address: body.address,
          taxNumber: body.taxNumber,
          currency: body.currency,
          settings: { create: {} },
        },
      });

      await tx.userBusinessRole.create({
        data: {
          userId: request.user!.id,
          businessId: biz.id,
          role: 'OWNER',
        },
      });

      await tx.account.create({
        data: {
          businessId: biz.id,
          accountName: 'Cash In Hand',
          accountType: 'CASH',
        },
      });

      return biz;
    }, { maxWait: 10000, timeout: 20000 });

    return reply.status(201).send({
      success: true,
      data: business,
    });
  });

  // Get current active business profile & settings
  fastify.get('/current', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const business = await globalPrisma.business.findUnique({
      where: { id: request.tenant!.businessId },
      include: { 
        settings: true,
        subscriptionPackage: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1
        }
      },
    });

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: business,
    });
  });

  // Update active business profile (Name, Phone, Address, PAN/VAT, Logo, Currency)
  fastify.put('/current', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const body = updateBusinessSchema.parse(request.body);

    const updated = await globalPrisma.$transaction(async (tx) => {
      let subUpdateData: any = {};
      
      // If user is trying to update their subscription package (e.g. selecting a free plan)
      if (body.subscriptionPackageId) {
        const currentBiz = await tx.business.findUnique({
          where: { id: request.tenant!.businessId },
          include: { subscriptionPackage: true },
        });

        // Only process if it's a new package
        if (currentBiz?.subscriptionPackageId !== body.subscriptionPackageId) {
          const pkg = await tx.subscriptionPackage.findUnique({ where: { id: body.subscriptionPackageId } });

          if (!pkg) {
            throw new AppError('Subscription package not found', 404, 'NOT_FOUND');
          }

          if (Number(pkg.price) > 0) {
            throw new AppError('Paid plans must be purchased through a payment gateway', 400, 'BAD_REQUEST');
          }

          // Compute forfeited days if previously on a paid plan
          const wasPaidPlan =
            currentBiz?.subscriptionPackage &&
            currentBiz.subscriptionPackage.name?.toLowerCase() !== 'free' &&
            Number(currentBiz.subscriptionPackage.price || 0) > 0;

          const prevExpiry = currentBiz?.currentPeriodEnd ? new Date(currentBiz.currentPeriodEnd) : null;
          const forfeitedDays =
            wasPaidPlan && prevExpiry && prevExpiry > new Date()
              ? Math.ceil((prevExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : 0;

          // Free plan expiration
          let addDays = 30;
          if (pkg.billingPeriod === 'YEARLY') addDays = 365;
          let trialDays = pkg.trialDays || 0;

          const now = new Date();
          const endDate = new Date(now);
          endDate.setDate(endDate.getDate() + addDays + trialDays);

          await tx.subscription.create({
            data: {
              businessId: request.tenant!.businessId,
              subscriptionPackageId: pkg.id,
              status: 'ACTIVE',
              startDate: now,
              endDate,
            },
          });

          subUpdateData = {
            subscriptionPackageId: pkg.id,
            subscriptionStatus: 'ACTIVE',
            currentPeriodEnd: endDate,
            isActive: true,
          };

          // 1. Audit Log for Plan Switch
          await tx.auditLog.create({
            data: {
              userId: request.user!.id,
              businessId: request.tenant!.businessId,
              action: 'PLAN_SWITCH',
              module: 'SUBSCRIPTION',
              recordId: pkg.id,
              ipAddress: request.ip,
              details: {
                fromPackage: currentBiz?.subscriptionPackage?.name || 'None',
                toPackage: pkg.name,
                wasPaidPlan,
                forfeitedDays,
                previousPeriodEnd: prevExpiry ? prevExpiry.toISOString() : null,
                newPeriodEnd: endDate.toISOString(),
                userAgent: request.headers['user-agent'],
              },
              oldValue: {
                packageId: currentBiz?.subscriptionPackageId,
                packageName: currentBiz?.subscriptionPackage?.name,
                status: currentBiz?.subscriptionStatus,
                currentPeriodEnd: prevExpiry ? prevExpiry.toISOString() : null,
              },
              newValue: {
                packageId: pkg.id,
                packageName: pkg.name,
                status: 'ACTIVE',
                currentPeriodEnd: endDate.toISOString(),
              },
            },
          });

          // 2. System Log for Superadmin visibility
          await tx.systemLog.create({
            data: {
              adminId: request.user!.id,
              action: 'USER_PLAN_SWITCH',
              targetId: request.tenant!.businessId,
              targetType: 'Business',
              ipAddress: request.ip,
              details: {
                businessName: currentBiz?.name,
                fromPackage: currentBiz?.subscriptionPackage?.name || 'None',
                toPackage: pkg.name,
                wasPaidPlan,
                forfeitedDays,
                previousPeriodEnd: prevExpiry ? prevExpiry.toISOString() : null,
                newPeriodEnd: endDate.toISOString(),
              },
            },
          });
        }
      }

      // Check for CUSTOM_BRANDING feature before allowing logoUrl updates
      if (body.logoUrl !== undefined) {
        const currentBiz = await tx.business.findUnique({
          where: { id: request.tenant!.businessId },
          include: { subscriptionPackage: true }
        });
        
        const currentLogoUrl = currentBiz?.logoUrl || '';
        const newLogoUrl = body.logoUrl || '';
        
        // If they are actually changing or setting the logo to a real image
        if (newLogoUrl && newLogoUrl !== currentLogoUrl) {
          const rawFeatures = currentBiz?.subscriptionPackage?.features;
          const userFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : (rawFeatures || []);
          
          if (!userFeatures.includes('CUSTOM_BRANDING')) {
            throw new AppError('Custom branding requires a Pro plan. Please upgrade your subscription.', 403, 'FEATURE_LOCKED');
          }
        }
      }

      return await tx.business.update({
        where: { id: request.tenant!.businessId },
        data: {
          name: body.name,
          phone: body.phone,
          email: body.email,
          address: body.address,
          taxNumber: body.taxNumber,
          currency: body.currency,
          logoUrl: body.logoUrl,
          profileCompleted: body.profileCompleted,
          setupCompleted: body.setupCompleted,
          ...subUpdateData
        },
        include: { settings: true },
      });
    }, { maxWait: 10000, timeout: 20000 });

    return reply.send({
      success: true,
      data: updated,
    });
  });

  // Update active business settings (Tax rates, document prefixes)
  fastify.put('/current/settings', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const body = updateBusinessSettingsSchema.parse(request.body);

    const updatedSettings = await globalPrisma.businessSetting.upsert({
      where: { businessId: request.tenant!.businessId },
      create: {
        businessId: request.tenant!.businessId,
        enableTax: body.enableTax,
        taxRate: body.taxRate,
        invoicePrefix: body.invoicePrefix,
        purchasePrefix: body.purchasePrefix,
        quotationPrefix: body.quotationPrefix,
        saleReturnPrefix: body.saleReturnPrefix,
        purchaseReturnPrefix: body.purchaseReturnPrefix,
        lowStockAlert: body.lowStockAlert,
      },
      update: {
        enableTax: body.enableTax,
        taxRate: body.taxRate,
        invoicePrefix: body.invoicePrefix,
        purchasePrefix: body.purchasePrefix,
        quotationPrefix: body.quotationPrefix,
        saleReturnPrefix: body.saleReturnPrefix,
        purchaseReturnPrefix: body.purchaseReturnPrefix,
        lowStockAlert: body.lowStockAlert,
      },
    });

    return reply.send({
      success: true,
      data: updatedSettings,
    });
  });

  // Get public keys of all users in the current business for Envelope Encryption
  fastify.get('/current/keys', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const memberships = await globalPrisma.userBusinessRole.findMany({
      where: { businessId: request.tenant!.businessId },
      include: {
        user: {
          select: {
            id: true,
            publicKey: true,
          }
        }
      }
    });

    const keys = memberships
      .filter(m => m.user.publicKey) // Only users with generated keys
      .map(m => ({
        userId: m.user.id,
        publicKey: m.user.publicKey
      }));

    return reply.send({
      success: true,
      data: keys,
    });
  });
}

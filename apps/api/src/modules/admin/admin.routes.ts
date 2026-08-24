import { FastifyInstance } from 'fastify';
import { globalPrisma } from '@bizmanage/database';
import { requireSystemAdmin } from '../../middleware/auth.js';
import { AppError } from '../../plugins/error-handler.js';
import argon2 from 'argon2';
import { z } from 'zod';
import { seedDefaultPackages } from '../../utils/seed.js';

export async function adminRoutes(fastify: FastifyInstance) {
  // Apply the requireSystemAdmin middleware to all routes in this plugin
  fastify.addHook('preHandler', requireSystemAdmin);

  // GET /admin/stats - Dashboard metrics
  fastify.get('/stats', async (request, reply) => {
    const [
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalUsers,
      pendingPaymentsCount,
    ] = await Promise.all([
      globalPrisma.business.count(),
      globalPrisma.business.count({ where: { isActive: true } }),
      globalPrisma.business.count({ where: { isActive: false } }),
      globalPrisma.user.count({ where: { isSystemAdmin: false } }),
      globalPrisma.subscriptionPayment.count({ where: { status: 'PENDING' } }),
    ]);

    // Get recently registered businesses
    const recentBusinesses = await globalPrisma.business.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return reply.send({
      success: true,
      data: {
        businesses: {
          total: totalBusinesses,
          active: activeBusinesses,
          suspended: suspendedBusinesses,
          recent: recentBusinesses,
        },
        users: {
          total: totalUsers,
        },
        payments: {
          pendingCount: pendingPaymentsCount,
        },
      },
    });
  });

  // GET /admin/businesses - List businesses with pagination and search
  fastify.get('/businesses', async (request, reply) => {
    const querySchema = z.object({
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
      search: z.string().optional(),
      status: z.enum(['all', 'active', 'suspended']).optional().default('all'),
    });

    const query = querySchema.parse(request.query);
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'suspended') {
      where.isActive = false;
    }

    const [businesses, total] = await Promise.all([
      globalPrisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          settings: true,
          subscriptionPackage: true,
          subscriptionPayments: {
            where: { status: 'PENDING' },
            include: { subscriptionPackage: true },
            take: 1,
          },
          memberships: {
            where: { role: 'OWNER' },
            include: { user: { select: { name: true, email: true } } },
            take: 1,
          }
        },
      }),
      globalPrisma.business.count({ where }),
    ]);

    // Format the response
    const formattedBusinesses = businesses.map(b => ({
      id: b.id,
      name: b.name,
      email: b.email,
      phone: b.phone,
      logoUrl: b.logoUrl,
      isActive: b.isActive,
      subscriptionStatus: b.subscriptionStatus,
      currentPeriodEnd: b.currentPeriodEnd,
      subscriptionPlan: b.subscriptionPackage ? b.subscriptionPackage.name : 'No Plan',
      subscriptionPackage: b.subscriptionPackage,
      storefront: {
        enableStorefront: b.settings?.enableStorefront ?? false,
        storeSlug: b.settings?.storeSlug || null,
        storeTitle: b.settings?.storeTitle || b.name,
      },
      pendingPayment: b.subscriptionPayments[0] ? {
        id: b.subscriptionPayments[0].id,
        packageName: b.subscriptionPayments[0].subscriptionPackage.name,
        amount: Number(b.subscriptionPayments[0].amount),
        referenceId: b.subscriptionPayments[0].referenceId,
      } : null,
      createdAt: b.createdAt,
      owner: b.memberships[0]?.user || null,
    }));

    return reply.send({
      success: true,
      data: {
        businesses: formattedBusinesses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  // PATCH /admin/businesses/:id/status is overridden below with logging

  // GET /admin/users - List all users
  fastify.get('/users', async (request, reply) => {
    const querySchema = z.object({
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
      search: z.string().optional(),
    });

    const query = querySchema.parse(request.query);
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const skip = (page - 1) * limit;

    const where: any = { isSystemAdmin: false };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      globalPrisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          isVerified: true,
          memberships: {
            include: {
              business: {
                select: { id: true, name: true, isActive: true },
              },
            },
          },
        },
      }),
      globalPrisma.user.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });
  // ---------------------------------------------------------
  // Audit Log Helper
  // ---------------------------------------------------------
  const logAdminAction = async (adminId: string, action: string, targetId?: string, targetType?: string, details?: any) => {
    try {
      await globalPrisma.systemLog.create({
        data: {
          adminId,
          action,
          targetId,
          targetType,
          details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        },
      });
    } catch (err) {
      console.error('Failed to write system log:', err);
    }
  };

  // Update existing status change to log
  fastify.patch('/businesses/:id/status', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ isActive: z.boolean() });

    const { id } = paramsSchema.parse(request.params);
    const { isActive } = bodySchema.parse(request.body);

    const business = await globalPrisma.business.update({
      where: { id },
      data: { isActive },
    });

    await logAdminAction(
      request.user.id,
      isActive ? 'BUSINESS_ACTIVATE' : 'BUSINESS_SUSPEND',
      id,
      'Business',
      { name: business.name }
    );

    return reply.send({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          isActive: business.isActive,
        },
      },
    });
  });

  fastify.get('/businesses/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    const business = await globalPrisma.business.findUnique({
      where: { id },
      include: {
        settings: true,
        subscriptionPackage: true,
        subscriptions: {
          orderBy: { endDate: 'desc' }
        },
        memberships: {
          include: { user: true }
        },

      },
    });

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND');
    }

    return reply.send({ success: true, data: business });
  });

  fastify.put('/businesses/:id/subscription', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      subscriptionPackageId: z.string().uuid().nullable(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { subscriptionPackageId } = bodySchema.parse(request.body);

    const business = await globalPrisma.$transaction(async (tx) => {
      const biz = await tx.business.update({
        where: { id },
        data: { subscriptionPackageId },
        include: { subscriptionPackage: true },
      });

      if (subscriptionPackageId) {
        const pkg = biz.subscriptionPackage;
        let addDays = 30;
        if (pkg?.billingPeriod === 'YEARLY') addDays = 365;
        let trialDays = pkg?.trialDays || 0;

        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + addDays + trialDays);

        await tx.subscription.create({
          data: {
            businessId: id,
            subscriptionPackageId,
            status: 'ACTIVE',
            startDate: now,
            endDate
          }
        });

        await tx.business.update({
          where: { id },
          data: {
            subscriptionStatus: 'ACTIVE',
            currentPeriodEnd: endDate,
            isActive: true,
          }
        });

        biz.subscriptionStatus = 'ACTIVE';
        biz.currentPeriodEnd = endDate;
        biz.isActive = true;
      }

      return biz;
    }, { maxWait: 10000, timeout: 20000 });

    await logAdminAction(request.user.id, 'BUSINESS_SUBSCRIPTION_UPDATE', id, 'Business', { subscriptionPackageId });
    return reply.send({ success: true, data: business });
  });

  fastify.put('/businesses/:id/overrides', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      planOverrides: z.any(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { planOverrides } = bodySchema.parse(request.body);

    const business = await globalPrisma.business.update({
      where: { id },
      data: { planOverrides: planOverrides as any },
    });

    await logAdminAction(request.user.id, 'BUSINESS_OVERRIDES_UPDATE', id, 'Business', { planOverrides });
    return reply.send({ success: true, data: business });
  });


  // ---------------------------------------------------------
  // Packages
  // ---------------------------------------------------------
  fastify.get('/packages', async (request, reply) => {
    const packages = await globalPrisma.subscriptionPackage.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return reply.send({ success: true, data: packages });
  });

  fastify.post('/packages/reset-defaults', async (request, reply) => {
    await seedDefaultPackages();
    await logAdminAction(request.user.id, 'PACKAGE_RESET_DEFAULTS', 'all', 'SubscriptionPackage', {});

    const packages = await globalPrisma.subscriptionPackage.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return reply.send({
      success: true,
      message: 'Old packages removed and default subscription packages synchronized successfully.',
      data: packages,
    });
  });

  fastify.post('/packages', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      price: z.number().min(0),
      currency: z.string().default('NPR'),
      billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
      trialDays: z.number().min(0).default(0),
      features: z.array(z.string()),
      isActive: z.boolean().default(true),
      displayOrder: z.number().default(0),
    });

    const data = schema.parse(request.body);
    const pkg = await globalPrisma.subscriptionPackage.create({
      data: {
        ...data,
        features: data.features as any,
      },
    });

    await logAdminAction(request.user.id, 'PACKAGE_CREATE', pkg.id, 'SubscriptionPackage', { name: pkg.name });

    return reply.send({ success: true, data: pkg });
  });

  fastify.put('/packages/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const schema = z.object({
      name: z.string().min(1),
      price: z.number().min(0),
      currency: z.string().default('NPR'),
      billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
      trialDays: z.number().min(0).default(0),
      features: z.array(z.string()),
      isActive: z.boolean(),
      displayOrder: z.number(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = schema.parse(request.body);

    const pkg = await globalPrisma.subscriptionPackage.update({
      where: { id },
      data: {
        ...data,
        features: data.features as any,
      },
    });

    await logAdminAction(request.user.id, 'PACKAGE_UPDATE', pkg.id, 'SubscriptionPackage', { name: pkg.name });

    return reply.send({ success: true, data: pkg });
  });

  fastify.delete('/packages/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    const pkg = await globalPrisma.subscriptionPackage.findUnique({
      where: { id }
    });

    if (!pkg) {
      throw new AppError('Package not found', 404, 'NOT_FOUND');
    }

    if (pkg.isDefault) {
      throw new AppError('Cannot delete the default subscription package', 400, 'BAD_REQUEST');
    }

    await globalPrisma.subscriptionPackage.delete({
      where: { id }
    });

    await logAdminAction(request.user.id, 'PACKAGE_DELETE', id, 'SubscriptionPackage', { name: pkg.name });

    return reply.send({ success: true, message: 'Package deleted successfully' });
  });

  // ---------------------------------------------------------
  // Logs
  // ---------------------------------------------------------
  fastify.get('/logs', async (request, reply) => {
    const querySchema = z.object({
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
    });

    const query = querySchema.parse(request.query);
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      globalPrisma.systemLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { name: true, email: true } },
        },
      }),
      globalPrisma.systemLog.count(),
    ]);

    return reply.send({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  // ---------------------------------------------------------
  // Settings
  // ---------------------------------------------------------
  fastify.put('/settings/password', async (request, reply) => {
    const schema = z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(6),
    });

    const { oldPassword, newPassword } = schema.parse(request.body);

    const user = await globalPrisma.user.findUnique({
      where: { id: request.user.id },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (!user.passwordHash) {
      throw new AppError('Password not set for this account', 400, 'INVALID_CREDENTIALS');
    }

    const isValid = await argon2.verify(user.passwordHash, oldPassword);
    if (!isValid) {
      throw new AppError('Incorrect older password', 400, 'INVALID_PASSWORD');
    }

    const newHash = await argon2.hash(newPassword);

    await globalPrisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await logAdminAction(request.user.id, 'PASSWORD_CHANGE', user.id, 'User', { changed: true });

    return reply.send({ success: true, message: 'Password updated successfully' });
  });


  // ---------------------------------------------------------
  // Reports
  // ---------------------------------------------------------
  fastify.get('/reports', async (request, reply) => {
    // Generate accurate reports from real data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalBusinesses,
      newBusinesses,
      activeBusinesses,
      totalUsers,
      totalPaymentRequests,
      pendingPaymentRequests,
      completedPaymentRequests,
      completedRevenueAgg,
    ] = await Promise.all([
      globalPrisma.business.count(),
      globalPrisma.business.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      globalPrisma.business.count({ where: { isActive: true } }),
      globalPrisma.user.count({ where: { isSystemAdmin: false } }),
      globalPrisma.subscriptionPayment.count(),
      globalPrisma.subscriptionPayment.count({ where: { status: 'PENDING' } }),
      globalPrisma.subscriptionPayment.count({ where: { status: 'COMPLETED' } }),
      globalPrisma.subscriptionPayment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    // Group businesses by the current package relation. `subscriptionPlan` was
    // removed from the schema in favour of `subscriptionPackageId`.
    const packagesDistribution = await globalPrisma.business.groupBy({
      by: ['subscriptionPackageId'],
      _count: true,
    });

    const packageIds = packagesDistribution
      .map((item) => item.subscriptionPackageId)
      .filter((id): id is string => id !== null);
    const packages = packageIds.length
      ? await globalPrisma.subscriptionPackage.findMany({
        where: { id: { in: packageIds } },
        select: { id: true, name: true },
      })
      : [];
    const packageNames = new Map(packages.map((pkg) => [pkg.id, pkg.name]));

    return reply.send({
      success: true,
      data: {
        totalBusinesses,
        newBusinesses,
        activeBusinesses,
        totalUsers,
        packagesDistribution: packagesDistribution.map(p => ({
          plan: p.subscriptionPackageId ? packageNames.get(p.subscriptionPackageId) ?? 'Deleted package' : 'No package',
          count: p._count,
        })),
        payments: {
          total: totalPaymentRequests,
          pending: pendingPaymentRequests,
          completed: completedPaymentRequests,
          totalRevenue: Number(completedRevenueAgg._sum.amount || 0),
        },
        note: "Revenue calculation includes all manually verified bank deposit payments."
      },
    });
  });

  // ── Payment Requests Management (Manual Bank QR Verification) ───────────────

  // GET /admin/payment-requests - List manual bank QR payment requests
  fastify.get('/payment-requests', async (request, reply) => {
    const querySchema = z.object({
      status: z.enum(['PENDING', 'COMPLETED', 'REJECTED', 'ALL']).optional().default('ALL'),
    });
    const { status } = querySchema.parse(request.query);

    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    const requests = await globalPrisma.subscriptionPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxNumber: true,
            currency: true,
            subscriptionStatus: true,
            subscriptionPackage: {
              select: { id: true, name: true },
            },
          },
        },
        subscriptionPackage: true,
      },
    });

    return reply.send({
      success: true,
      data: requests,
    });
  });

  // POST /admin/payment-requests/:id/approve - Approve payment & activate package
  fastify.post('/payment-requests/:id/approve', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const payment = await globalPrisma.subscriptionPayment.findUnique({
      where: { id },
      include: {
        subscriptionPackage: true,
        business: {
          include: { subscriptionPackage: true },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment request not found', 404, 'NOT_FOUND');
    }

    if (payment.status === 'COMPLETED') {
      throw new AppError('Payment request is already approved.', 400, 'BAD_REQUEST');
    }

    // Check if the business already has a CURRENT ACTIVE PAID PLAN (Free plan dates are NOT extended)
    const currentPkg = payment.business.subscriptionPackage;
    const isCurrentPaidPlan =
      payment.business.subscriptionStatus === 'ACTIVE' &&
      Boolean(currentPkg) &&
      currentPkg?.name?.toLowerCase() !== 'free' &&
      Number(currentPkg?.price || 0) > 0;

    const now = new Date();
    const existingEnd = payment.business.currentPeriodEnd ? new Date(payment.business.currentPeriodEnd) : null;
    const isFutureActive = isCurrentPaidPlan && existingEnd && !isNaN(existingEnd.getTime()) && existingEnd > now;

    // If on Free plan or expired, start fresh from now (today). Only extend if on an active Paid plan!
    const baseDate = isFutureActive ? existingEnd! : now;
    const durationDays = payment.subscriptionPackage.billingPeriod === 'YEARLY' ? 365 : 30;
    const periodEnd = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update payment, business subscription, and log system action
    await globalPrisma.$transaction([
      globalPrisma.subscriptionPayment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      }),
      globalPrisma.business.update({
        where: { id: payment.businessId },
        data: {
          subscriptionPackageId: payment.subscriptionPackageId,
          subscriptionStatus: 'ACTIVE',
          currentPeriodEnd: periodEnd,
        },
      }),
      globalPrisma.systemLog.create({
        data: {
          adminId: request.user!.id,
          action: 'PAYMENT_APPROVE',
          targetId: payment.businessId,
          targetType: 'Business',
          details: {
            paymentId: payment.id,
            packageName: payment.subscriptionPackage.name,
            amount: Number(payment.amount),
            referenceId: payment.referenceId,
            wasQueued: isFutureActive,
            previousPeriodEnd: existingEnd ? existingEnd.toISOString() : null,
            newPeriodEnd: periodEnd.toISOString(),
          },
        },
      }),
    ]);

    const queueMessage = isFutureActive
      ? ` (Remaining monthly days preserved. New plan queued until ${periodEnd.toLocaleDateString()})`
      : '';

    return reply.send({
      success: true,
      message: `Payment approved successfully. ${payment.business.name} is now on ${payment.subscriptionPackage.name} plan${queueMessage}.`,
    });
  });

  // POST /admin/payment-requests/:id/reject - Reject payment
  fastify.post('/payment-requests/:id/reject', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ reason: z.string().optional() }).parse(request.body || {});

    const payment = await globalPrisma.subscriptionPayment.findUnique({
      where: { id },
      include: { business: true, subscriptionPackage: true },
    });

    if (!payment) {
      throw new AppError('Payment request not found', 404, 'NOT_FOUND');
    }

    await globalPrisma.$transaction([
      globalPrisma.subscriptionPayment.update({
        where: { id },
        data: {
          status: 'REJECTED',
          failureReason: body.reason || 'Payment details could not be verified with Garima Bikas Bank statement.',
          updatedAt: new Date(),
        },
      }),
      globalPrisma.systemLog.create({
        data: {
          adminId: request.user!.id,
          action: 'PAYMENT_REJECT',
          targetId: payment.businessId,
          targetType: 'Business',
          details: {
            paymentId: payment.id,
            reason: body.reason,
          },
        },
      }),
    ]);

    return reply.send({
      success: true,
      message: 'Payment request rejected.',
    });
  });
}

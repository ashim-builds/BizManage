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
    });

    return reply.status(201).send({
      success: true,
      data: business,
    });
  });

  // Get current active business profile & settings
  fastify.get('/current', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const business = await globalPrisma.business.findUnique({
      where: { id: request.tenant!.businessId },
      include: { settings: true },
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

    const updated = await globalPrisma.business.update({
      where: { id: request.tenant!.businessId },
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        taxNumber: body.taxNumber,
        currency: body.currency,
        logoUrl: body.logoUrl,
      },
      include: { settings: true },
    });

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
}

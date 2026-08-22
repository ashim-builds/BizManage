import { FastifyInstance } from 'fastify';
import { globalPrisma } from '@bizmanage/database';
import { authenticateUser, requireBusinessTenant } from '../../middleware/auth.js';
import { AppError } from '../../plugins/error-handler.js';
import { z } from 'zod';

const subscribeRequestSchema = z.object({
  packageId: z.string().uuid(),
  referenceId: z.string().min(3, 'Transaction reference number is required'),
  senderName: z.string().min(2, 'Sender name or mobile is required'),
  notes: z.string().optional(),
});

export async function publicPackageRoutes(fastify: FastifyInstance) {
  // GET /packages - List all active packages
  fastify.get('/', async (request, reply) => {
    const packages = await globalPrisma.subscriptionPackage.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return reply.send({ success: true, data: packages });
  });

  // POST /packages/subscribe-request - Submit manual QR bank transfer verification request
  fastify.post('/subscribe-request', { preHandler: [authenticateUser, requireBusinessTenant] }, async (request, reply) => {
    const body = subscribeRequestSchema.parse(request.body);
    const businessId = request.tenant!.businessId;

    const pkg = await globalPrisma.subscriptionPackage.findUnique({
      where: { id: body.packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new AppError('Selected subscription package does not exist or is inactive.', 404, 'NOT_FOUND');
    }

    // Create a pending SubscriptionPayment record
    const payment = await globalPrisma.subscriptionPayment.create({
      data: {
        businessId,
        subscriptionPackageId: pkg.id,
        amount: pkg.price,
        status: 'PENDING',
        gateway: 'BANK_QR',
        referenceId: body.referenceId,
        verificationResponse: {
          senderName: body.senderName,
          notes: body.notes || '',
          bankName: 'Garima Bikas Bank Limited',
          submittedAt: new Date().toISOString(),
          submittedByUserId: request.user!.id,
          submittedByUserEmail: request.user!.email,
        },
      },
      include: {
        subscriptionPackage: true,
      },
    });

    // Audit log & System log for Superadmin visibility
    await Promise.all([
      globalPrisma.auditLog.create({
        data: {
          businessId,
          userId: request.user!.id,
          action: 'CREATE',
          module: 'SUBSCRIPTION_PAYMENT_REQUEST',
          recordId: payment.id,
          newValue: {
            packageName: pkg.name,
            amount: Number(pkg.price),
            referenceId: body.referenceId,
            senderName: body.senderName,
          },
        },
      }),
      globalPrisma.systemLog.create({
        data: {
          adminId: request.user!.id,
          action: 'PAYMENT_SUBMIT',
          targetId: businessId,
          targetType: 'Business',
          details: {
            paymentId: payment.id,
            packageName: pkg.name,
            amount: Number(pkg.price),
            referenceId: body.referenceId,
            senderName: body.senderName,
          },
        },
      }),
    ]);

    return reply.status(201).send({
      success: true,
      message: 'Payment verification request submitted successfully. Superadmin will verify and activate your plan.',
      data: payment,
    });
  });

  // GET /packages/my-payment-requests - Get latest pending/recent payment requests for current business
  fastify.get('/my-payment-requests', { preHandler: [authenticateUser, requireBusinessTenant] }, async (request, reply) => {
    const businessId = request.tenant!.businessId;

    const requests = await globalPrisma.subscriptionPayment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        subscriptionPackage: true,
      },
    });

    return reply.send({
      success: true,
      data: requests,
    });
  });
}

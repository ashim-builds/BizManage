import { FastifyInstance } from 'fastify';
import { globalPrisma } from '@bizmanage/database';
import { AuditService } from '../../services/audit.service.js';
import { requireBusinessTenant } from '../../middleware/auth.js';
import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';

const signedFields = 'total_amount,transaction_uuid,product_code';
const paymentUrl = env.ESEWA_ENVIRONMENT === 'production'
  ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
  : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const statusUrl = env.ESEWA_ENVIRONMENT === 'production'
  ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
  : 'https://rc.esewa.com.np/api/epay/transaction/status/';

const initiateSchema = z.object({ packageId: z.string().uuid() });
const verifySchema = z.object({ data: z.string().min(1) });
const transactionSchema = z.object({ transactionUuid: z.string().regex(/^[A-Za-z0-9-]+$/) });
const redirectSchema = z.object({
  status: z.string(), signature: z.string(), transaction_code: z.string().optional(),
  total_amount: z.union([z.string(), z.number()]), transaction_uuid: z.string(),
  product_code: z.string(), signed_field_names: z.string(),
}).passthrough();

type GatewayStatus = 'COMPLETE' | 'SUCCESS' | 'FAILED' | 'CANCELED' | 'PENDING' | 'NOT_FOUND' | 'EXPIRED';

function amountString(value: number) {
  return Number(value.toFixed(2)).toString();
}

function signatureFor(fields: string, values: Record<string, unknown>) {
  const message = fields.split(',').map((field) => `${field}=${String(values[field] ?? '')}`).join(',');
  return crypto.createHmac('sha256', env.ESEWA_SECRET_KEY).update(message).digest('base64');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function userMessage(status: GatewayStatus) {
  if (status === 'COMPLETE' || status === 'SUCCESS') return 'Payment verified successfully.';
  if (status === 'CANCELED') return 'Payment Cancelled';
  if (status === 'PENDING') return 'Payment Pending';
  if (status === 'NOT_FOUND' || status === 'EXPIRED') return 'Payment Expired';
  return 'Payment Failed';
}

export async function esewaRoutes(fastify: FastifyInstance) {
  async function logPaymentSystemEvent(
    actorId: string,
    action: string,
    payment: { id: string; businessId: string; gatewayTransactionUuid: string | null },
    status: GatewayStatus,
    details: Record<string, unknown>,
  ) {
    await globalPrisma.systemLog.create({
      data: {
        adminId: actorId,
        action,
        targetId: payment.id,
        targetType: 'SubscriptionPayment',
        details: { businessId: payment.businessId, transactionUuid: payment.gatewayTransactionUuid, status, ...details } as never,
      },
    });
  }

  async function checkStatus(transactionUuid: string, businessId: string, actorId: string, ipAddress: string) {
    const payment = await globalPrisma.subscriptionPayment.findFirst({
      where: { gatewayTransactionUuid: transactionUuid, businessId },
      include: { subscriptionPackage: true, business: true },
    });
    if (!payment) throw new Error('Payment not found');

    const totalAmount = amountString(payment.amount.toNumber());
    const url = new URL(statusUrl);
    url.searchParams.set('product_code', env.ESEWA_MERCHANT_CODE);
    url.searchParams.set('total_amount', totalAmount);
    url.searchParams.set('transaction_uuid', transactionUuid);

    let verificationResponse: Record<string, unknown>;
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      verificationResponse = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(verificationResponse.error_message ?? `HTTP ${response.status}`));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown verification error';
      fastify.log.error({ transactionUuid, reason }, 'eSewa status verification failed');
      await globalPrisma.subscriptionPayment.update({ where: { id: payment.id }, data: { gatewayStatus: 'PENDING', failureReason: reason } });
      return { status: 'PENDING' as GatewayStatus, message: 'Payment Pending', payment };
    }

    const status = String(verificationResponse.status ?? '').toUpperCase() as GatewayStatus;
    const verifiedUuid = String(verificationResponse.transaction_uuid ?? verificationResponse.pid ?? '');
    const verifiedProductCode = String(verificationResponse.product_code ?? verificationResponse.scd ?? '');
    const verifiedAmount = Number(verificationResponse.total_amount ?? verificationResponse.totalAmount);
    if (!['COMPLETE', 'SUCCESS', 'FAILED', 'CANCELED', 'PENDING', 'NOT_FOUND', 'EXPIRED'].includes(status)
      || verifiedUuid !== transactionUuid || verifiedProductCode !== env.ESEWA_MERCHANT_CODE
      || !Number.isFinite(verifiedAmount) || Math.abs(verifiedAmount - Number(totalAmount)) > 0.001) {
      const reason = 'eSewa verification response did not match the stored transaction';
      fastify.log.error({ transactionUuid, status, verifiedUuid, verifiedProductCode, verifiedAmount, reason }, 'Invalid eSewa verification response');
      await globalPrisma.subscriptionPayment.update({ where: { id: payment.id }, data: { gatewayStatus: status || 'PENDING', failureReason: reason, verificationResponse: verificationResponse as never } });
      return { status: 'PENDING' as GatewayStatus, message: 'Payment Pending', payment };
    }

    fastify.log.info({ transactionUuid, status, verificationResponse }, 'eSewa transaction verified');
    const statusChanged = payment.gatewayStatus !== status;
    if (status === 'COMPLETE' || status === 'SUCCESS') {
      if (payment.status !== 'COMPLETED') {
        await globalPrisma.$transaction(async (tx) => {
          await tx.subscriptionPayment.update({ where: { id: payment.id }, data: { status: 'COMPLETED', gatewayStatus: status, referenceId: String(verificationResponse.ref_id ?? verificationResponse.refId ?? ''), failureReason: null, verificationResponse: verificationResponse as never } });
          if (payment.invoiceId) await tx.billingInvoice.update({ where: { id: payment.invoiceId }, data: { status: 'PAID', paidAmount: payment.amount } });
          const now = new Date();
          const startDate = payment.business.currentPeriodEnd && new Date(payment.business.currentPeriodEnd) > now ? new Date(payment.business.currentPeriodEnd) : now;
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (payment.subscriptionPackage.billingPeriod === 'YEARLY' ? 365 : 30) + (payment.subscriptionPackage.trialDays || 0));
          const subscription = await tx.subscription.create({ data: { businessId: payment.businessId, subscriptionPackageId: payment.subscriptionPackageId, status: 'ACTIVE', startDate, endDate } });
          if (payment.invoiceId) await tx.billingInvoice.update({ where: { id: payment.invoiceId }, data: { subscriptionId: subscription.id } });
          await tx.business.update({ where: { id: payment.businessId }, data: { subscriptionPackageId: payment.subscriptionPackageId, subscriptionStatus: 'ACTIVE', currentPeriodEnd: endDate, isActive: true } });
        });
        AuditService.logEvent({ action: 'SUBSCRIPTION_PAYMENT_COMPLETED', module: 'SubscriptionPayment', businessId: payment.businessId, recordId: payment.id, ipAddress, newValue: { status, transactionUuid } });
        await logPaymentSystemEvent(actorId, 'SUBSCRIPTION_PAYMENT_COMPLETED', payment, status, {
          referenceId: verificationResponse.ref_id ?? verificationResponse.refId ?? null,
          outcome: 'Payment verified and subscription activated',
        });
      }
    } else {
      const paymentStatus = status === 'PENDING' ? 'PENDING' : 'FAILED';
      await globalPrisma.$transaction(async (tx) => {
        await tx.subscriptionPayment.update({ where: { id: payment.id }, data: { status: paymentStatus, gatewayStatus: status, referenceId: String(verificationResponse.ref_id ?? verificationResponse.refId ?? '') || null, failureReason: userMessage(status), verificationResponse: verificationResponse as never } });
        if (payment.invoiceId && status !== 'PENDING') await tx.billingInvoice.update({ where: { id: payment.invoiceId }, data: { status: status === 'CANCELED' ? 'CANCELLED' : 'FAILED' } });
      });
      if (statusChanged && status !== 'PENDING') {
        await logPaymentSystemEvent(actorId, `SUBSCRIPTION_PAYMENT_${status}`, payment, status, {
          referenceId: verificationResponse.ref_id ?? verificationResponse.refId ?? null,
          outcome: userMessage(status),
        });
      }
    }
    return { status, message: userMessage(status), payment };
  }

  fastify.post('/initiate', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const { packageId } = initiateSchema.parse(request.body); const businessId = request.tenant!.businessId;
    const pkg = await globalPrisma.subscriptionPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new Error('Package not found');
    if (pkg.price.toNumber() <= 0) throw new Error('This package is free and does not require payment');
    const amount = pkg.price.toNumber(); const totalAmount = amountString(amount); const transactionUuid = `esewa-${crypto.randomUUID()}`;
    const invoice = await globalPrisma.billingInvoice.create({ data: { invoiceNumber: `INV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`, businessId, amount, total: amount, status: 'PENDING' } });
    const payment = await globalPrisma.subscriptionPayment.create({ data: { businessId, subscriptionPackageId: packageId, invoiceId: invoice.id, amount, status: 'PENDING', gateway: 'eSewa', gatewayTransactionUuid: transactionUuid, gatewayStatus: 'PENDING' } });
    const signature = signatureFor(signedFields, { total_amount: totalAmount, transaction_uuid: transactionUuid, product_code: env.ESEWA_MERCHANT_CODE });
    fastify.log.info({ transactionUuid, amount: totalAmount, environment: env.ESEWA_ENVIRONMENT }, 'eSewa payment initiated');
    AuditService.logEvent({ action: 'SUBSCRIPTION_PAYMENT_INITIATED', module: 'SubscriptionPayment', businessId, userId: request.user.id, recordId: payment.id, ipAddress: request.ip, newValue: { transactionUuid, amount: totalAmount } });
    const callback = `${env.FRONTEND_URL}/subscription/verify?transaction_uuid=${encodeURIComponent(transactionUuid)}`;
    return reply.send({ success: true, data: { amount: totalAmount, tax_amount: '0', product_service_charge: '0', product_delivery_charge: '0', total_amount: totalAmount, transaction_uuid: transactionUuid, product_code: env.ESEWA_MERCHANT_CODE, success_url: callback, failure_url: `${callback}&status=failure`, signed_field_names: signedFields, signature, paymentUrl } });
  });

  fastify.post('/verify', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const { data } = verifySchema.parse(request.body);
    let parsed: z.infer<typeof redirectSchema>;
    try { parsed = redirectSchema.parse(JSON.parse(Buffer.from(data, 'base64').toString('utf8'))); } catch { throw new Error('Invalid eSewa payment response'); }
    if (!safeEqual(signatureFor(parsed.signed_field_names, parsed), parsed.signature)) throw new Error('Invalid eSewa payment response signature');
    if (!['COMPLETE', 'SUCCESS'].includes(parsed.status.toUpperCase())) return reply.send({ success: false, status: parsed.status, message: userMessage(parsed.status.toUpperCase() as GatewayStatus) });
    const result = await checkStatus(parsed.transaction_uuid, request.tenant!.businessId, request.user.id, request.ip);
    return reply.send({ success: result.status === 'COMPLETE' || result.status === 'SUCCESS', status: result.status, message: result.message });
  });

  fastify.get('/status/:transactionUuid', { preHandler: [requireBusinessTenant] }, async (request, reply) => {
    const { transactionUuid } = transactionSchema.parse(request.params);
    const result = await checkStatus(transactionUuid, request.tenant!.businessId, request.user.id, request.ip);
    return reply.send({ success: result.status === 'COMPLETE' || result.status === 'SUCCESS', status: result.status, message: result.message });
  });
}

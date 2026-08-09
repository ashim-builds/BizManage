import { globalPrisma } from '@bizmanage/database';
import { FastifyRequest } from 'fastify';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'oldpassword',
  'newpassword',
  'otp',
  'otphash',
  'token',
  'tokenhash',
  'jwt',
  'secret',
  'cookie',
  'resettoken',
  'clientsecret',
  'smtp_password',
  'smtppassword',
  'authorization',
  'cookie',
]);

/**
 * Recursively redacts sensitive values from objects before logging
 */
export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = redactSensitiveData(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  return data;
}

export interface AuditLogOptions {
  request?: FastifyRequest;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
  businessId?: string;
}

/**
 * Creates an AuditLog entry in the database asynchronously without blocking caller thread
 */
export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    const userId = options.userId || options.request?.user?.id || null;
    const businessId = options.businessId || options.request?.tenant?.businessId || null;
    const ipAddress = options.request?.ip || (options.request?.headers['x-forwarded-for'] as string) || null;
    const userAgent = (options.request?.headers['user-agent'] as string) || null;

    const cleanedOldValue = options.oldValue !== undefined ? redactSensitiveData(options.oldValue) : null;
    const cleanedNewValue = options.newValue !== undefined ? redactSensitiveData(options.newValue) : null;

    await globalPrisma.auditLog.create({
      data: {
        userId,
        businessId,
        action: options.action,
        module: options.module,
        recordId: options.recordId || null,
        ipAddress,
        userAgent,
        oldValue: cleanedOldValue,
        newValue: cleanedNewValue,
      },
    });
  } catch (err) {
    // Audit log failure must not crash the primary operational transaction
    console.error('⚠️ [AUDIT LOG ERROR] Failed to record audit log:', err);
  }
}

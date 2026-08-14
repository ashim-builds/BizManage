import { globalPrisma } from '@bizmanage/database';

export interface AuditLogOptions {
  userId?: string;
  businessId?: string;
  action: string;
  module: string;
  recordId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
}

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'otp',
  'secret',
  'googleid',
  'jwt',
  'creditcard',
];

/**
 * Deep sanitization function to strip sensitive data from objects before logging
 */
export function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  if (typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeData(data[key]);
      }
    }
    return result;
  }

  return data;
}

export class AuditService {
  /**
   * Logs an event asynchronously. Errors are caught and logged to prevent blocking the main request thread.
   */
  static logEvent(options: AuditLogOptions): void {
    const { userId, businessId, action, module, recordId, ipAddress, details, oldValue, newValue } = options;

    globalPrisma.auditLog
      .create({
        data: {
          userId,
          businessId,
          action,
          module,
          recordId,
          ipAddress,
          details: details ? sanitizeData(details) : undefined,
          oldValue: oldValue ? sanitizeData(oldValue) : undefined,
          newValue: newValue ? sanitizeData(newValue) : undefined,
        },
      })
      .catch((error) => {
        console.error('Failed to write Audit Log:', error);
      });
  }
}

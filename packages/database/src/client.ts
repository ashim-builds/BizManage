import { PrismaClient } from '@prisma/client';

export const globalPrisma = new PrismaClient();

const SENSITIVE_KEYS = ['password', 'passwordhash', 'token', 'refreshtoken', 'otp', 'secret', 'googleid', 'jwt', 'creditcard'];

function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeData(data[key]);
      }
    }
    return result;
  }
  return data;
}

export const createTenantClient = (businessId: string, userId?: string, ipAddress?: string) => {
  return globalPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: { model: string; operation: string; args: any; query: (args: any) => Promise<any> }) {
          const tenantModels = [
            'PartyCategory',
            'Party',
            'ItemCategory',
            'Item',
            'StockMovement',
            'Quotation',
            'Sale',
            'SaleReturn',
            'Purchase',
            'PurchaseReturn',
            'Account',
            'PaymentIn',
            'PaymentOut',
            'Expense',
            'Income',
            'Transaction',
            'BusinessSetting',
            'AccountTransfer',
            'SubscriptionPayment',
          ];

          if (tenantModels.includes(model)) {
            if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(operation)) {
              args = args || {};
              args.where = { ...args.where, businessId };
            }

            if (['create', 'createMany'].includes(operation)) {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item: any) => ({ ...item, businessId }));
              } else if (args.data) {
                args.data = { ...args.data, businessId };
              }
            }

            if (['findUnique', 'findUniqueOrThrow'].includes(operation)) {
              const result = await query(args);
              if (result && result.businessId && result.businessId !== businessId) {
                if (operation === 'findUniqueOrThrow') throw new Error(`Access denied for ${model}`);
                return null;
              }
              return result;
            }

              let recordForAudit: any = null;

              if (['update', 'delete'].includes(operation)) {
                const id = args.where?.id;
                
                if (!id) {
                  throw new Error(`Strict multi-tenant security: ${operation} on ${model} must use 'id' in the where clause.`);
                }
                
                // Fetch the full record for auditing and security check
                recordForAudit = await (globalPrisma as any)[model].findUnique({
                  where: { id },
                });
                
                if (!recordForAudit || recordForAudit.businessId !== businessId) {
                  throw new Error(`Access denied for ${model}`);
                }

                // Prevent IDOR by ensuring businessId cannot be maliciously updated
                if (operation === 'update' && args.data) {
                  delete args.data.businessId;
                }
              }

              if (operation === 'updateMany' && args.data) {
                delete args.data.businessId;
              }

              const result = await query(args);

              // POST-QUERY Hook for Audit Logging
              if (['create', 'update', 'delete'].includes(operation)) {
                globalPrisma.auditLog.create({
                  data: {
                    userId,
                    businessId,
                    action: `${operation.toUpperCase()}_${model.toUpperCase()}`,
                    module: model,
                    recordId: result?.id || args.where?.id,
                    ipAddress,
                    oldValue: recordForAudit ? sanitizeData(recordForAudit) : undefined,
                    newValue: result ? sanitizeData(result) : undefined,
                  }
                }).catch(err => console.error('Failed to log tenant mutation:', err));
              }

              return result;
            }

            return query(args);
        },
      },
    },
  });
};

export type TenantPrismaClient = ReturnType<typeof createTenantClient>;

import { PrismaClient } from '@prisma/client';

export const globalPrisma = new PrismaClient();

export const createTenantClient = (businessId: string) => {
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
          ];

          if (tenantModels.includes(model)) {
            if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(operation)) {
              args.where = { ...args.where, businessId };
            }

            if (['create', 'createMany'].includes(operation)) {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item: any) => ({ ...item, businessId }));
              } else if (args.data) {
                args.data = { ...args.data, businessId };
              }
            }
          }

          return query(args);
        },
      },
    },
  });
};

export type TenantPrismaClient = ReturnType<typeof createTenantClient>;

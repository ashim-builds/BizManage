import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startSubscriptionCron } from './cron/subscription.job.js';
import { globalPrisma as prisma } from '@bizmanage/database';

const app = buildApp();

async function syncProductionSchema() {
  const statements = [
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "enableStorefront" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "storeSlug" TEXT;`,
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "showStorePrices" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "storeTitle" TEXT;`,
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "storeDescription" TEXT;`,
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "storeBannerUrl" TEXT;`,
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT;`,
    `ALTER TABLE "BusinessSetting" ADD COLUMN IF NOT EXISTS "enableOnlineOrders" BOOLEAN DEFAULT true;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "BusinessSetting_storeSlug_key" ON "BusinessSetting"("storeSlug");`,

    `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "isPublishedToStore" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "showPriceOnStore" BOOLEAN;`,
    `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "storeDescription" TEXT;`,
    `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
  ];

  try {
    await prisma.$connect();
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err) {
        console.error(`⚠️ Notice executing SQL statement [${stmt}]:`, err);
      }
    }
    console.log('✅ Database schema auto-synchronized with production PostgreSQL');
  } catch (err) {
    console.error('⚠️ Database schema sync error:', err);
  }
}

app.listen({ port: env.PORT, host: env.HOST }, async (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  await syncProductionSchema();
  startSubscriptionCron();
  console.log(`🚀 Server listening on ${address}`);
});

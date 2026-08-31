import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startSubscriptionCron } from './cron/subscription.job.js';
import { globalPrisma as prisma } from '@bizmanage/database';

const app = buildApp();

async function syncProductionSchema() {
  // Disabled: Schema auto-sync script is Postgres-specific.
  // Standard migrations handle the creation of all fields for MySQL.
}

app.listen({ port: env.PORT, host: env.HOST }, async (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  // await syncProductionSchema();
  startSubscriptionCron();
  console.log(`🚀 Server listening on ${address}`);
});

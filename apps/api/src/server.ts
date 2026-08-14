import { buildApp } from './app.js';
import { env } from './config/env.js';
import { seedDefaultPackages } from './utils/seed.js';
import { startSubscriptionCron } from './cron/subscription.job.js';
const app = buildApp();

app.listen({ port: env.PORT, host: env.HOST }, async (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  await seedDefaultPackages();
  startSubscriptionCron();
  console.log(`🚀 Server listening on ${address}`);
});



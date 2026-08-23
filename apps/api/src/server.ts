import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startSubscriptionCron } from './cron/subscription.job.js';
const app = buildApp();

app.listen({ port: env.PORT, host: env.HOST }, async (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  startSubscriptionCron();
  console.log(`🚀 Server listening on ${address}`);
});



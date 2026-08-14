import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { globalErrorHandler } from './plugins/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { businessRoutes } from './modules/business/business.routes.js';
import { categoryRoutes } from './modules/category/category.routes.js';
import { partyRoutes } from './modules/party/party.routes.js';
import { itemRoutes } from './modules/item/item.routes.js';
import { purchaseRoutes } from './modules/purchase/purchase.routes.js';
import { saleRoutes } from './modules/sale/sale.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { esewaRoutes } from './modules/payment/esewa.routes.js';
import { expenseRoutes } from './modules/expense/expense.routes.js';
import { incomeRoutes } from './modules/income/income.routes.js';
import { cashflowRoutes } from './modules/cashflow/cashflow.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { reportRoutes } from './modules/report/report.routes.js';
import { utilityRoutes } from './modules/utility/utility.routes.js';
import { accountRoutes } from './modules/account/account.routes.js';
import { transferRoutes } from './modules/transfer/transfer.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { publicPackageRoutes } from './modules/package/package.routes.js';
import { globalPrisma as prisma } from '@bizmanage/database';

const isProduction = env.NODE_ENV === 'production';

export function buildApp() {
  const app = fastify({
    bodyLimit: 10 * 1024 * 1024, // 10MB body limit for base64 logo uploads & data imports
    // Pino logger: structured JSON in production, human-readable in development
    logger: isProduction
      ? {
          level: 'info',
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url,
                headers: { host: request.headers.host },
                remoteAddress: request.ip,
              };
            },
          },
        }
      : {
          level: 'debug',
        },
    // Trust X-Forwarded-For from Nginx
    trustProxy: isProduction,
    // Remove X-Powered-By header
    disableRequestLogging: false,
  });

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.register(cors, {
    origin: (origin, cb) => {
      // In dev or if CORS_ORIGIN is '*', allow any requesting origin
      if (!isProduction || !origin || env.CORS_ORIGIN === '*') {
        cb(null, true);
        return;
      }
      const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim());
      // Check exact match or trailing slash variations
      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed = allowed.some((a) => a.replace(/\/$/, '') === cleanOrigin);
      if (isAllowed) {
        cb(null, true);
      } else {
        // Echo origin for subdomains or render domains
        cb(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Business-Id', 'Cookie'],
  });

  // ── Cookie ──────────────────────────────────────────────────────────────────
  app.register(cookie, {
    secret: env.JWT_SECRET, // signed cookies
    parseOptions: {
      secure: true,                             // HTTPS required on Render
      httpOnly: true,                           // Protection against XSS
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain cookies on Render
      path: '/',
    },
  });

  // ── JWT ──────────────────────────────────────────────────────────────────────
  app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  });

  // ── Rate Limiting ─────────────────────────────────────────────────────────────
  app.register(rateLimit, {
    max: isProduction ? 60 : 1000,   // tighter limit in production
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait before retrying.',
    }),
  });

  // ── Error Handler ─────────────────────────────────────────────────────────────
  app.setErrorHandler(globalErrorHandler);

  // ── Not Found Handler ─────────────────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  // ── Health Check ──────────────────────────────────────────────────────────────
  // Deep health check: verifies DB connectivity and returns service status
  app.get('/health', async (request, reply) => {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
        database: 'connected',
        latency_ms: Date.now() - start,
      });
    } catch (err) {
      reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        message: 'Database connection failed',
      });
    }
  });

  // ── API Routes ────────────────────────────────────────────────────────────────
  app.register(authRoutes,     { prefix: '/api/v1/auth' });
  app.register(businessRoutes, { prefix: '/api/v1/businesses' });
  app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  app.register(partyRoutes,    { prefix: '/api/v1/parties' });
  app.register(itemRoutes,     { prefix: '/api/v1/items' });
  app.register(purchaseRoutes, { prefix: '/api/v1/purchases' });
  app.register(saleRoutes,     { prefix: '/api/v1/sales' });
  app.register(paymentRoutes,  { prefix: '/api/v1/payments' });
  app.register(esewaRoutes,  { prefix: '/api/v1/esewa' });
  app.register(expenseRoutes,  { prefix: '/api/v1/expenses' });
  app.register(incomeRoutes,   { prefix: '/api/v1/income' });
  app.register(cashflowRoutes, { prefix: '/api/v1/cashflow' });
  app.register(dashboardRoutes,{ prefix: '/api/v1/dashboard' });
  app.register(reportRoutes,   { prefix: '/api/v1/reports' });
  app.register(utilityRoutes,  { prefix: '/api/v1/utilities' });
  app.register(accountRoutes,  { prefix: '/api/v1/accounts' });
  app.register(transferRoutes, { prefix: '/api/v1/transfers' });
  app.register(adminRoutes,    { prefix: '/api/v1/admin' });
  app.register(publicPackageRoutes, { prefix: '/api/v1/packages' });

  return app;
}

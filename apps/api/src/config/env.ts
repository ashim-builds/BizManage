import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Walk up from __dirname (dist/config/) to find the monorepo root .env
function findEnvFile(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const envPath = findEnvFile(path.resolve());
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // fallback: let dotenv search default locations
}

const envSchema = z.object({
  NODE_ENV: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return 'production';
      const clean = val.trim().toLowerCase();
      if (clean === 'development' || clean === 'test' || clean === 'production') return clean;
      return 'production';
    }),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://postgres:postgres@localhost:5432/bizmanage?schema=public'),

  JWT_SECRET: z
    .string()
    .default('super-secret-jwt-key-min-32-chars-long!'),

  JWT_REFRESH_SECRET: z
    .string()
    .default('super-secret-refresh-key-min-32-chars!'),

  CORS_ORIGIN: z
    .string()
    .default('*'),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/v1/auth/google/callback'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@bizmanage.com'),
  SMTP_FROM_NAME: z.string().default('BizManage Team'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
};

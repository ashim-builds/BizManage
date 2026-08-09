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

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://postgres:postgres@localhost:5432/bizmanage?schema=public'),

  JWT_SECRET: z
    .string()
    .min(isProduction ? 32 : 1, `JWT_SECRET must be at least 32 characters in production`)
    .default('super-secret-jwt-key-min-32-chars-long!'),

  JWT_REFRESH_SECRET: z
    .string()
    .min(isProduction ? 32 : 1, `JWT_REFRESH_SECRET must be at least 32 characters in production`)
    .default('super-secret-refresh-key-min-32-chars!'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

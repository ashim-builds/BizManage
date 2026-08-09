# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package manifests (for pnpm install)
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/database/package.json ./packages/database/

COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod=false

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copy source files
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma client & build all packages
RUN pnpm --filter @bizmanage/database build
RUN pnpm --filter @bizmanage/types build
RUN pnpm --filter @bizmanage/validation build
RUN pnpm --filter @bizmanage/api build

# ─── Stage 3: Production Runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup --system --gid 1001 bizmanage && \
    adduser  --system --uid 1001 bizmanage

# Copy only production artifacts
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/config/package.json ./packages/config/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/validation/package.json ./packages/validation/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled dist files
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema (needed for migrate deploy at startup)
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy Prisma client generated in node_modules
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0 \
     ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Set non-root user
USER bizmanage

EXPOSE 4000

ENV NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]

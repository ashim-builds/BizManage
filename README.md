# 🏬 BizManage ERP — Multi-Tenant Business & Inventory Management SaaS

**BizManage** is a production-ready, full-featured multi-tenant ERP software built for modern retail, hardware, sanitary, and commercial businesses. Built as a high-performance **pnpm monorepo** with **Next.js 14 (App Router)**, **Fastify**, **Prisma ORM**, and **PostgreSQL**.

---

## 🌟 Key Features

- **🔒 Multi-Tenant Isolation**: Multi-tenant data partition per business tenant (`businessId`).
- **🔑 Argon2id & Google OAuth**: Dual authentication via Argon2id password hashing or Google OAuth 2.0 with PKCE and account linking.
- **✉️ Transactional SMTP & 6-Digit OTP**: First-time registration email verification with 6-digit OTP, security login alerts, password resets, and invoice emails.
- **💳 Double-Entry Accounting**: Automatic Cash in Hand, Bank Accounts, and Mobile Wallets tracking.
- **📄 Sales & Purchases**: Auto-numbered Sales Invoices (`INV-`) & Purchase Bills (`PUR-`).
- **↩️ Credit & Debit Notes**: Real-world Sales Returns (`CN-`) & Purchase Returns (`DN-`) with original rate protection, inventory restoration, over-return & over-payment guards.
- **👥 Party Ledgers**: Automated customer receivables & supplier payables tracking.
- **📦 Inventory & Stock Movements**: Transaction-driven stock calculations with low stock alert thresholds and manual stock adjustment logging.
- **📝 Audit Logging**: Structured audit trail tracking user actions, IP addresses, and timestamps with automatic sensitive key redaction.
- **📊 Real-Time Analytics**: Executive Dashboard, Cashflow (7-Day Daily & 12-Month Monthly), Profit & Loss, and exportable financial reports.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, React Hook Form, Zod, TanStack Query
- **Backend API**: Fastify, TypeScript, Prisma ORM, Argon2, Fastify Cookie, Fastify JWT, Nodemailer
- **Database**: PostgreSQL
- **Monorepo Manager**: pnpm workspaces + Turborepo

---

## 📋 Prerequisites

Before running the application, make sure you have installed:
- **Node.js** (v18.x or v20.x recommended)
- **pnpm** (Install globally via `npm install -g pnpm`)
- **PostgreSQL Database** (Local PostgreSQL server, Docker container, or cloud DB like Neon / Supabase)

---

## 🚀 Step-by-Step Quick Start Guide

### 1. Clone or Open Project Directory

```bash
cd c:\Users\ashim\OneDrive\Documents\bizmanage
```

### 2. Install Monorepo Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Connection URL (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bizmanage?schema=public"

# API & Auth Secrets
JWT_SECRET="super-secret-jwt-key-min-32-chars-long!"
JWT_REFRESH_SECRET="super-secret-refresh-key-min-32-chars!"
NODE_ENV="development"
PORT=4000
CORS_ORIGIN="http://localhost:3000"

# Web App Public API Endpoint
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=bizmanage.app@gmail.com
SMTP_PASSWORD=gnnp ekyn txqn veql
SMTP_FROM=bizmanage.app@gmail.com
SMTP_FROM_NAME=BizManage

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=184976106440-gpo88k2plo9ff1niqt2dg8pi7df98qer.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 4. Setup Database Schema & Seed Initial Data

Push the database schema and generate Prisma client:

```bash
# Push Prisma schema to PostgreSQL database
pnpm --filter @bizmanage/database exec prisma db push

# Generate Prisma Client
pnpm --filter @bizmanage/database exec prisma generate
```

### 5. Launch Development Server

Start both the **Next.js Frontend** (port 3000) and **Fastify Backend API** (port 4000) concurrently:

```bash
pnpm dev
```

---

## 🌐 Accessing the Application

| Service | URL | Description |
|---|---|---|
| **Web UI App** | [http://localhost:3000](http://localhost:3000) | Main Dashboard & Portal |
| **Backend API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Fastify REST API |

---

## 📁 Repository Structure

```text
bizmanage/
├── apps/
│   ├── api/              # Fastify Node.js Backend API
│   └── web/              # Next.js 14 App Router Frontend Web UI
├── docs/                 # Backup strategy & architecture docs
├── packages/
│   ├── database/         # Prisma Schema & Database Client
│   ├── types/            # Shared TypeScript type definitions
│   └── validation/       # Zod validation schemas for API & Web
├── scripts/              # Backup and deployment scripts
├── package.json          # Root pnpm workspace configuration
└── turbo.json            # Turborepo build pipeline
```

---

## 🔧 Useful CLI Commands

| Command | Description |
|---|---|
| `pnpm dev` | Starts frontend (3000) and backend (4000) concurrently |
| `pnpm build` | Builds production bundles for all packages |
| `npx tsx apps/api/src/tests/run-all-tests.ts` | Runs complete 7-suite integration & security test runner |
| `pnpm --filter @bizmanage/database exec prisma studio` | Opens Prisma GUI Database Inspector |

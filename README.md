# 🏬 BizManage ERP — Multi-Tenant Business & Inventory Management SaaS

**BizManage** is a production-ready, full-featured multi-tenant ERP software built for modern retail, hardware, sanitary, and commercial businesses. Built as a high-performance **pnpm monorepo** with **Next.js 14 (App Router)**, **Fastify**, **Prisma ORM**, and **PostgreSQL**.

---

## 🌟 Key Features

- **🔒 Multi-Tenant Isolation**: Secure data partition per business tenant (`businessId`).
- **💳 Double-Entry Accounting**: Automatic Cash in Hand, Bank Accounts, and Mobile Wallets tracking.
- **📄 Sales & Purchases**: Auto-numbered Sales Invoices (`INV-`) & Purchase Bills (`PUR-`).
- **↩️ Credit & Debit Notes**: Real-world Sales Returns (`CN-`) & Purchase Returns (`DN-`) with original rate protection & inventory restoration.
- **👥 Party Ledgers**: Automated customer receivables & supplier payables tracking.
- **📦 Inventory & Stock Movements**: Transaction-driven stock calculations with low stock alert thresholds.
- **📊 Real-Time Analytics**: Executive Dashboard, Cashflow (7-Day Daily & 12-Month Monthly), Profit & Loss, and exportable financial reports.
- **🛡️ Enterprise Security**: Argon2id password hashing, JWT Access Tokens, HttpOnly Cookies, and session revocation.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, React Hook Form, Zod, TanStack Query
- **Backend API**: Fastify, TypeScript, Prisma ORM, Argon2, Fastify Cookie, Fastify JWT
- **Database**: PostgreSQL
- **Monorepo Manager**: pnpm workspaces + Turborepo

---

## 📋 Prerequisites

Before running the application, make sure you have installed:

- **Node.js** (v18.x or v20.x recommended)
- **pnpm** (Install globally via `npm install -g pnpm`)
- **PostgreSQL Database** (Local PostgreSQL server, Docker container, or free cloud DB like [Neon.tech](https://neon.tech) / [Supabase](https://supabase.com))

---

## 🚀 Step-by-Step Quick Start Guide

### 1. Clone or Open Project Directory

```bash
cd c:\Users\ashim\OneDrive\Documents\bizmanage
```

### 2. Install All Monorepo Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (or inside `apps/api/.env` and `packages/database/.env`):

```env
# Database Connection URL (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bizmanage_db?schema=public"

# API & Auth Secrets
JWT_SECRET="super_secret_jwt_key_998877665544332211"
COOKIE_SECRET="super_secret_cookie_key_112233445566778899"
NODE_ENV="development"
PORT=4000
FRONTEND_URL="http://localhost:3000"

# Web App Public API Endpoint
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
```

### 4. Setup Database Schema & Seed Initial Data

Push the database schema and generate Prisma client:

```bash
# Push Prisma schema to PostgreSQL database
pnpm --filter @bizmanage/database exec prisma db push

# Generate Prisma Client
pnpm --filter @bizmanage/database exec prisma generate
```

### 5. Launch the Development Server

Start both the **Next.js Frontend** (port 3000) and **Fastify Backend API** (port 4000) concurrently:

```bash
pnpm dev
```

---

## 🌐 Accessing the Application

Once the development server is running:

| Service         | URL                                                          | Description             |
| --------------- | ------------------------------------------------------------ | ----------------------- |
| **Web UI App**  | [http://localhost:3000](http://localhost:3000)               | Main Dashboard & Portal |
| **Backend API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Fastify REST API        |

---

## 🔑 Default Test Credentials

Use these pre-configured credentials to sign in immediately:

- **Email / Username**: `test@gmail.com`
- **Password**: `test123`
- **Active Business**: `test` / `RB Hardware & Sanitary House`

---

## 📁 Repository Structure

```text
bizmanage/
├── apps/
│   ├── api/              # Fastify Node.js Backend API
│   └── web/              # Next.js 14 App Router Frontend Web UI
├── packages/
│   ├── database/         # Prisma Schema & Database Client
│   ├── shared/           # Shared utility helper functions
│   ├── types/            # Shared TypeScript type definitions
│   └── validation/       # Zod validation schemas for API & Web
├── package.json          # Root pnpm workspace configuration
└── turbo.json            # Turborepo build pipeline
```

---

## 🔧 Useful CLI Commands

| Command                                                 | Description                                            |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                                              | Starts frontend (3000) and backend (4000) concurrently |
| `pnpm build`                                            | Builds production bundles for all packages             |
| `pnpm --filter @bizmanage/database exec prisma studio`  | Opens Prisma GUI Database Inspector                    |
| `pnpm --filter @bizmanage/database exec prisma db push` | Syncs Prisma schema with database                      |

---

## 🚀 Production Deployment

Refer to the [Render Deployment Guide](file:///C:/Users/ashim/.gemini/antigravity-ide/brain/76c1e9cc-d823-4bfc-b2d8-576f1dd1a19a/render_deployment_guide.md) for 100% free hosting instructions on Render.com and Neon PostgreSQL!

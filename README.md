# BizManage ERP — Multi-Tenant Business & Inventory Management SaaS

**BizManage** is a production-ready, full-featured multi-tenant ERP software built for modern retail, hardware, sanitary, and commercial businesses. Built as a high-performance **pnpm monorepo** with **Next.js 14 (App Router)**, **Fastify**, **Prisma ORM**, and **PostgreSQL**.

---

## Project Overview & Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, React Hook Form, Zod, TanStack Query
- **Backend API**: Fastify, TypeScript, Prisma ORM, Argon2, Fastify Cookie, Fastify JWT
- **Database**: PostgreSQL (Dockerized)
- **Monorepo Manager**: pnpm workspaces + Turborepo
- **Key Features**: Multi-Tenant Isolation, Double-Entry Accounting, Sales & Purchases, Credit & Debit Notes, Party Ledgers, Inventory & Stock Movements, Real-Time Analytics, Enterprise Security.

---

## Prerequisites

Before setting up the project on a fresh laptop, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **pnpm**: v9.0.0 or higher (Install globally: `npm install -g pnpm`)
- **Docker & Docker Compose**: For running the local PostgreSQL database
- **Git**: For version control

---

## Fresh-Laptop Setup Flow from Zero

Follow these exact steps to run the project locally from scratch:

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd BizManage
```

### 2. Install Dependencies

Install all monorepo dependencies using pnpm:

```bash
pnpm install
```

### 3. Setup Environment Variables

Copy the example environment configuration to create your local `.env` file:

```bash
cp .env.example .env
```

Ensure `.env` contains the required placeholders (the defaults work out-of-the-box for local development). Make sure to check the database connection string matches your Docker configuration.

### 4. Start Docker Database

Start the PostgreSQL container in the background:

```bash
docker-compose up -d
```
*Wait a few seconds for the database to become healthy.*

### 5. Setup Database Schema & Generate Client

Sync the Prisma schema with your local database and generate the client:

```bash
pnpm --filter @bizmanage/database db:push
pnpm --filter @bizmanage/database db:generate
```
*(Optional) If you have migrations, use `pnpm --filter @bizmanage/database db:migrate` instead of `db:push`.*

### 6. Start the Development Server

Start the Fastify Backend API and Next.js Frontend concurrently:

```bash
pnpm dev
```

---

## Local URLs and Ports

Once the development server is running, the services will be available at:

| Service         | Local URL                                                    | Description             |
| --------------- | ------------------------------------------------------------ | ----------------------- |
| **Web UI App**  | [http://localhost:3000](http://localhost:3000)               | Main Dashboard & Portal |
| **Backend API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Fastify REST API        |
| **Database**    | `localhost:5432`                                             | PostgreSQL              |

**Default Test Credentials** (If seeded or manually created):
- **Email**: `test@gmail.com` or `admin@bizmanage.com`
- **Password**: `test123` or `admin123`

---

## Project Structure

```text
bizmanage/
├── apps/
│   ├── api/              # Fastify Node.js Backend API (Port 4000)
│   ├── desktop/          # Electron Desktop App
│   └── web/              # Next.js 14 App Router Frontend (Port 3000)
├── packages/
│   ├── database/         # Prisma Schema & Database Client (PostgreSQL)
│   ├── shared/           # Shared utility helper functions
│   ├── types/            # Shared TypeScript type definitions
│   └── validation/       # Zod validation schemas for API & Web
├── docker-compose.yml    # Local PostgreSQL configuration
├── package.json          # Root pnpm workspace configuration
└── turbo.json            # Turborepo build pipeline
```

---

## Useful Commands

### Development
- `pnpm dev` - Starts frontend and backend concurrently
- `pnpm format` - Formats code using Prettier
- `pnpm lint` - Runs linter across all packages

### Docker Management
- `docker-compose up -d` - Starts the database in the background
- `docker-compose down` - Stops and removes the database container
- `docker-compose logs -f postgres` - Views database logs

### Database & Prisma
- `pnpm --filter @bizmanage/database db:generate` - Generates Prisma Client
- `pnpm --filter @bizmanage/database db:push` - Syncs schema to the database
- `pnpm --filter @bizmanage/database db:studio` - Opens Prisma GUI Database Inspector

### Production
- `pnpm build` - Builds production bundles for all packages

---

## 🛠️ Common Troubleshooting

**1. `pnpm install` fails with Electron errors**
If `apps/desktop` causes issues with `electron@^latest`, ensure `apps/desktop/package.json` specifies `"electron": "latest"` without the caret (`^`).

**2. Database connection fails (`P1001`)**
Ensure Docker is running and the container is healthy:
```bash
docker-compose ps
```
If the container is not running, start it using `docker-compose up -d`.

**3. Turborepo cache issues**
If builds or dev servers act stale, try running with `--no-cache` or clearing `.turbo` folders:
```bash
rm -rf .turbo
```

**4. ModuleResolution errors during `pnpm build` in `apps/desktop`**
Ensure `apps/desktop/tsconfig.json` uses `"moduleResolution": "Node16"` and `"module": "Node16"`, as `Node10` module resolution is deprecated in newer TypeScript versions. Also ensure it has `"rootDir": "./src"` if using an explicit `src` directory.

---

## Production Deployment

Refer to the `render_deployment_guide.md` for hosting instructions on Render.com and Neon PostgreSQL!

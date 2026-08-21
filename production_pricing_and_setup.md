# 💰 BizManage ERP — Production Cost & Deployment Breakdown

This document provides the complete **pricing breakdown**, **service recommendations**, and **setup configuration** for hosting **BizManage ERP** from launch ($0/mo) to 1,000+ active business tenants (~$46–$75/mo).

---

## 📊 1. Monthly Cost Breakdown by Growth Tier

### 🟢 Tier 1: Free Launch Tier (0 to 20 Businesses)
> **Best for**: Testing, demoing to clients, and early soft launch.

| Service | Provider | Plan | Monthly Cost |
|---|---|---|---|
| **Domain** | Cloudflare / Namecheap | `bizmanage.com` | ~$0.83 / mo ($10/yr) |
| **Frontend Web** | Render / Vercel | Free Web Service | **$0.00** |
| **Backend API** | Render | Free Web Service | **$0.00** |
| **Database** | Neon.tech | Free Postgres (0.5 GB) | **$0.00** |
| **Email SMTP** | Resend.com | Free Plan (3,000 emails/mo) | **$0.00** |
| **Total Monthly Cost** | | | **~$0.83 / month** |

---

### 🟡 Tier 2: Recommended Growth Tier (20 to 500 Businesses) ⭐ RECOMMENDED
> **Best for**: Production SaaS launch with zero cold starts, fast 24/7 API uptime, and high concurrency.

| Service | Provider | Plan / Specs | Monthly Cost |
|---|---|---|---|
| **Custom Domain** | Cloudflare / Namecheap | `bizmanage.com` | ~$0.83 / mo ($10/yr) |
| **Frontend Web App** | Vercel | Pro Plan (Edge CDN, global SSR) | **$20.00 / mo** |
| **Backend REST API** | Render or Railway | Paid Web Service (1 GB RAM, 1 vCPU, 24/7) | **$7.00 – $15.00 / mo** |
| **PostgreSQL Database** | Neon.tech | Launch Plan (Connection pooling enabled) | **$19.00 / mo** |
| **Transactional Email** | Resend.com | Starter Plan (Up to 50,000 emails/mo) | **$0.00 – $20.00 / mo** |
| **Total Monthly Cost** | | | **~$46.83 – $74.83 / month** |

---

### 🔵 Tier 3: High Scale Tier (1,000+ Active Businesses)
> **Best for**: Enterprise scale with automated container autoscaling and dedicated database servers.

| Service | Provider | Specs | Monthly Cost |
|---|---|---|---|
| **Domain & WAF** | Cloudflare | Pro Plan (DDoS protection + WAF) | **$20.00 / mo** |
| **Frontend Web App** | Vercel | Pro Plan (Unlimited CDN traffic) | **$20.00 / mo** |
| **Backend REST API** | GCP Cloud Run / Render | 2x Auto-scaling Instances (2 GB RAM) | **$25.00 – $40.00 / mo** |
| **PostgreSQL Database** | Neon / AWS RDS | 4 GB RAM, 2 vCPU Dedicated Instance | **$35.00 / mo** |
| **Transactional Email** | Resend / SendGrid | Pro Email Plan | **$20.00 / mo** |
| **Total Monthly Cost** | | | **~$120.00 / month** |

---

## 🛠️ 2. Step-by-Step Production Setup Instructions

### Step 1: Purchase Domain Name
1. Purchase `bizmanage.com` on **[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)** or **Namecheap**.
2. Cost: ~$10 / year.

---

### Step 2: Configure Custom DNS Records

In your Cloudflare / Namecheap DNS management panel, add these 3 records:

| Type | Name / Host | Value / Target | Description |
|---|---|---|---|
| **A** | `@` | `216.24.57.1` | Points `bizmanage.com` to Frontend Web App |
| **CNAME** | `www` | `bizmanage-web.onrender.com` | Points `www.bizmanage.com` |
| **CNAME** | `api` | `bizmanage-yopp.onrender.com` | Points `api.bizmanage.com` to Backend API |

---

### Step 3: Set Up Resend for Transactional Email (Invoices & Passwords)
1. Create a free account on **[Resend.com](https://resend.com)**.
2. Add domain `bizmanage.com` to Resend and copy the DNS TXT records to Cloudflare for email verification.
3. Generate an API Key (e.g., `re_123456789...`).
4. In `apps/api/.env`, configure:
   ```env
   RESEND_API_KEY="re_123456789..."
   DEFAULT_FROM_EMAIL="invoices@bizmanage.com"
   ```

---

### Step 4: Environment Variables Matrix for Production

#### Backend API (`bizmanage-api`):
```env
NODE_ENV="production"
PORT=4000
HOST="0.0.0.0"
DATABASE_URL="postgresql://user:pass@ep-cool-lake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="super_secret_jwt_key_min_32_chars_long_12345"
COOKIE_SECRET="super_secret_cookie_key_min_32_chars_long_12345"
CORS_ORIGIN="https://bizmanage.com,https://www.bizmanage.com"
```

#### Frontend Web App (`bizmanage-web`):
```env
NODE_ENV="production"
NEXT_PUBLIC_API_URL="https://api.bizmanage.com/api/v1"
```

---

## 🔒 3. Security & Automated Backups Checklist

1. **Daily Database Backups**: Neon.tech automatically retains point-in-time database backups for 14 days.
2. **Automated SSL/TLS**: Render and Vercel automatically generate free auto-renewing Let's Encrypt SSL certificates for `https://bizmanage.com` and `https://api.bizmanage.com`.
3. **CORS Security**: Backend API restricts request origin strictly to `https://bizmanage.com` with `sameSite: 'none'` cross-domain session cookies.

---

## ⚡ 4. Website Speed & Database Performance Optimizations

To ensure data loads instantly for end-users, configure the following:

1. **Server Region Alignment (Critical)**
   - Your Neon Database is hosted in **AWS us-east-2 (Ohio)**. 
   - You **MUST** select **Ohio (US East)** when setting up your Render Backend API.
   - *Why?* If your API is in Frankfurt but your DB is in Ohio, every single database query takes 150ms of network travel time. Keeping them in the exact same region reduces query latency to < 2ms!

2. **Connection Pooling**
   - Always use the Neon pooled connection string (with `-pooler` in the URL) in production.
   - Add connection limits to your `DATABASE_URL` (e.g., `?connection_limit=20&pool_timeout=10`) so Prisma handles traffic spikes smoothly without freezing.

3. **Database Indexing**
   - Prisma `@@index`es have been added on high-traffic fields (like `businessId` and `createdAt` in invoices and transactions) to ensure search operations remain fast even with millions of rows.

4. **API Pagination & Caching**
   - Limit API payloads using `take` and `skip`. The frontend leverages client-side caching to prevent unnecessary re-fetching.

# 🚀 How to Deploy BizManage for FREE on Render & Neon

This guide walks you through deploying the **BizManage ERP** monorepo (Fastify API + Next.js Web + PostgreSQL) using **100% Free Tiers** on **Render.com** and **Neon.tech**.

---

## 📋 Prerequisites & Architecture Overview

| Component | Service | Cost |
|---|---|---|
| **Database** | [Neon.tech](https://neon.tech) (PostgreSQL) | **Free** ($0) |
| **Backend API** | [Render.com](https://render.com) (Web Service - Node.js) | **Free** ($0) |
| **Frontend Web** | [Render.com](https://render.com) or [Vercel](https://vercel.com) | **Free** ($0) |

---

## Step 1: Create a Free PostgreSQL Database on Neon.tech

1. Go to [Neon.tech](https://neon.tech) and sign up with GitHub.
2. Click **Create Project** and name it `bizmanage-db`.
3. Copy the **Connection String** (PostgreSQL URL). It looks like this:
   ```env
   DATABASE_URL="postgresql://alex_owner:abc123xyz@ep-cool-lake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

---

## Step 2: Push your Code to GitHub

Make sure your project repository is pushed to GitHub (`main` or `dev` branch):
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

---

## Step 3: Deploy Backend API on Render.com

1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect your **GitHub Repository** (`ashim-builds/bizmanage`).
3. Configure the Web Service settings:
   - **Name**: `bizmanage-api`
   - **Environment**: `Node`
   - **Region**: Choose closest region (e.g. Singapore / Frankfurt / Oregon)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (monorepo root)
   - **Build Command**:
     ```bash
     pnpm install && pnpm --filter @bizmanage/database exec prisma migrate deploy && pnpm build
     ```
   - **Start Command**:
     ```bash
     pnpm --filter @bizmanage/api start
     ```
   - **Plan**: `Free` ($0/mo)

4. Environment Variables:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(Paste your Neon database URL from Step 1)* |
   | `JWT_SECRET` | `super_secret_jwt_key_min_32_chars_long_12345` |
   | `COOKIE_SECRET` | `super_secret_cookie_key_min_32_chars_long_12345` |
   | `PORT` | `4000` |
   | `CORS_ORIGIN` | `*` *(or your web URL once created)* |

5. Click **Create Web Service**. Wait for Render to build. Once complete, copy your API URL:
   `https://bizmanage-api.onrender.com`

---

## Step 4: Deploy Frontend Web App on Render.com

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect the same **GitHub Repository**.
3. Configure settings:
   - **Name**: `bizmanage-web`
   - **Environment**: `Node`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     pnpm install && pnpm build
     ```
   - **Start Command**:
     ```bash
     pnpm --filter @bizmanage/web start
     ```
   - **Plan**: `Free` ($0/mo)

4. Environment Variables:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `NEXT_PUBLIC_API_URL` | `https://bizmanage-api.onrender.com/api/v1` |

5. Click **Create Web Service**. Once built, copy your Web App URL:
   `https://bizmanage-web.onrender.com`

---

## Step 5: Connect API to Frontend CORS

1. Go back to your **`bizmanage-api`** service on Render.
2. In **Environment Variables**, set:
   - `CORS_ORIGIN` = `https://bizmanage-web.onrender.com`
3. Click **Save Changes** (Render will auto-redeploy).

---

## 🎉 Test your Live ERP App!

Open your live web link (`https://bizmanage-web.onrender.com`):
- Click **Register Business** to select the **Free Plan** and create your first owner account!
- Log in and start managing your inventory, purchases, sales, and credit/debit notes!

> 💡 **Tip for Free Tier Spin-Down**: Free Render web services sleep after 15 minutes of inactivity. The first request after sleep takes ~30 seconds to spin up. This is normal on Render's $0 free plan!

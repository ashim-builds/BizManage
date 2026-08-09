# BizManage Database Backup, Recovery & Production Security Strategy

## 1. Production Backup Architecture

BizManage multi-tenant ERP relies on PostgreSQL as its authoritative relational database. To guarantee zero data loss and business continuity, the following automated backup policy is established:

### Automated Backup Schedule
- **Daily Full Backups**: Automated `pg_dump` compressed dumps executed daily at 02:00 UTC using `scripts/backup-db.sh`.
- **Retention Period**:
  - Daily backups: Retained for **30 days**.
  - Weekly snapshots: Retained for **12 months**.
  - Monthly snapshots: Retained for **7 years** (compliance / financial audits).
- **Offsite Encryption**: All `.sql.gz` dump archives are encrypted at rest using AES-256 (`gpg --symmetric`) before transferring to Cloud Storage (Google Cloud Storage / AWS S3) with Object Versioning enabled.

---

## 2. Disaster Recovery & Restoration Procedure

### Emergency Restoration Steps
In the event of database failure or corrupted state:

1. **Stop Application Instances**:
   ```bash
   pnpm stop # or stop Render / K8s deployment
   ```

2. **Retrieve Latest Encrypted Dump**:
   ```bash
   gsutil cp gs://bizmanage-backups-prod/bizmanage_backup_YYYYMMDD_HHMMSS.sql.gz.gpg ./
   gpg --decrypt bizmanage_backup_YYYYMMDD_HHMMSS.sql.gz.gpg > restore.sql.gz
   ```

3. **Restore PostgreSQL Database**:
   ```bash
   gunzip -c restore.sql.gz | psql "$DATABASE_URL"
   ```

4. **Verify Database Consistency & Run Migrations**:
   ```bash
   npx prisma migrate status
   npx tsx apps/api/src/tests/run-all-tests.ts
   ```

---

## 3. Production Environment & Secrets Policy

- **Zero Secrets in Source Control**: All credentials (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `SMTP_PASSWORD`) are loaded strictly from environment variables.
- **Production Cookie Settings**:
  - `HttpOnly: true` (Protects against XSS token extraction).
  - `Secure: true` (Forces HTTPS transmission).
  - `SameSite: none` / `lax` (Prevents CSRF attacks).
- **Rate Limiting & Payload Controls**:
  - Payload Size Cap: `1MB` (`bodyLimit: 1048576`).
  - API Rate Limit: 60 req/min in production.
  - Sensitive Endpoint Limits: 5 req / 15 min on login; 3 req / 15 min on OTP/password reset.

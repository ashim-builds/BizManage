#!/bin/bash
# ==============================================================================
# BizManage Enterprise Database Backup & Recovery Script
# Target: PostgreSQL Database Automated Dumps
# ==============================================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/bizmanage_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${RETENTION_DAYS:-30}

mkdir -p "${BACKUP_DIR}"

echo "📦 [BIZMANAGE BACKUP] Starting PostgreSQL database backup..."
echo "   Target file: ${BACKUP_FILE}"

if [ -z "${DATABASE_URL}" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set."
  exit 1
fi

# Execute compressed pg_dump
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"

echo "✅ Backup completed successfully. Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Clean up old backups older than retention days
echo "🧹 Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "bizmanage_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm {} \;

echo "🎉 Database backup cycle finished."

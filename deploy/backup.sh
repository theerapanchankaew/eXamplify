#!/bin/sh
# Daily PostgreSQL backup (runs in the "backup" compose service).
# Files: /backups/examplify-YYYYmmdd-HHMMSS.sql.gz, kept BACKUP_KEEP_DAYS days.
# Restore: see docs/DEPLOYMENT.md
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

while true; do
  file="/backups/examplify-$(date +%Y%m%d-%H%M%S).sql.gz"
  # --clean --if-exists: the dump drops and recreates tables, so it can be restored over a live database.
  if pg_dump --no-owner --no-privileges --clean --if-exists | gzip > "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "[backup] ok: $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.tmp"
    echo "[backup] FAILED at $(date)" >&2
  fi
  find /backups -name 'examplify-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
  sleep "$INTERVAL"
done

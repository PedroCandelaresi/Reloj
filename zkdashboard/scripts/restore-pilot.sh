#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: $0 <backup-db.dump> <attachments.tar.gz>"
  exit 1
fi

DB_DUMP="$1"
ATTACHMENTS_TAR="$2"
DB_CONTAINER="${DB_CONTAINER:-zkdashboard_db}"
DB_USER="${DB_USER:-zkuser}"
DB_NAME="${DB_NAME:-zkdashboard}"
ATTACHMENTS_VOLUME="${ATTACHMENTS_VOLUME:-zkdashboard_attendance_attachments}"

cat "$DB_DUMP" | docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists
docker run --rm \
  -v "$ATTACHMENTS_VOLUME":/attachments \
  -v "$(dirname "$(realpath "$ATTACHMENTS_TAR")")":/backup:ro \
  alpine sh -c "rm -rf /attachments/* && cd /attachments && tar xzf /backup/$(basename "$ATTACHMENTS_TAR")"

echo "Restore completado."

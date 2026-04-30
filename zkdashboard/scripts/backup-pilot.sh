#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DB_CONTAINER="${DB_CONTAINER:-zkdashboard_db}"
DB_USER="${DB_USER:-zkuser}"
DB_NAME="${DB_NAME:-zkdashboard}"
ATTACHMENTS_VOLUME="${ATTACHMENTS_VOLUME:-zkdashboard_attendance_attachments}"

mkdir -p "$BACKUP_DIR"

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_DIR/db-$TIMESTAMP.dump"
docker run --rm \
  -v "$ATTACHMENTS_VOLUME":/attachments:ro \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine sh -c "cd /attachments && tar czf /backup/attachments-$TIMESTAMP.tar.gz ."

echo "Backup generado:"
echo "  $BACKUP_DIR/db-$TIMESTAMP.dump"
echo "  $BACKUP_DIR/attachments-$TIMESTAMP.tar.gz"

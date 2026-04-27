import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceRecordUniqueConstraint20260417000500
  implements MigrationInterface
{
  name = 'AddAttendanceRecordUniqueConstraint20260417000500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicateRows = await queryRunner.query(`
      SELECT
        "device_sn" AS "deviceSn",
        "user_id" AS "userId",
        "timestamp",
        COUNT(*)::int AS "count",
        MIN("id") AS "firstId",
        MAX("id") AS "lastId"
      FROM "attendance_records"
      GROUP BY "device_sn", "user_id", "timestamp"
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, "timestamp" DESC
      LIMIT 20
    `);

    if (duplicateRows.length > 0) {
      const preview = duplicateRows
        .map(
          (row) =>
            `deviceSn=${row.deviceSn} userId=${row.userId} timestamp=${row.timestamp} count=${row.count} ids=${row.firstId}-${row.lastId}`,
        )
        .join('; ');

      throw new Error(
        'No se creó el índice único UQ_attendance_records_device_user_timestamp porque existen fichadas duplicadas. ' +
          'Ejecutá src/database/reports/attendance-duplicates.sql, limpiá los datos con confirmación operativa y reintentá la migración. ' +
          `Primeros duplicados: ${preview}`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_attendance_records_device_user_timestamp"
      ON "attendance_records" ("device_sn", "user_id", "timestamp")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_attendance_records_device_user_timestamp"
    `);
  }
}

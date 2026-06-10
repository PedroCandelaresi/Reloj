import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceCompanyScope20260417000400 implements MigrationInterface {
  name = 'AddAttendanceCompanyScope20260417000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        ADD COLUMN IF NOT EXISTS "device_id" integer,
        ADD COLUMN IF NOT EXISTS "company_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "attendance_records" AS "attendance"
      SET
        "device_id" = "device"."id",
        "company_id" = COALESCE("attendance"."company_id", "device"."company_id")
      FROM "devices" AS "device"
      WHERE "device"."serial_number" = "attendance"."device_sn"
        AND (
          "attendance"."device_id" IS DISTINCT FROM "device"."id"
          OR (
            "attendance"."company_id" IS NULL
            AND "device"."company_id" IS NOT NULL
          )
        )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_device_id"
      ON "attendance_records" ("device_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_company_id"
      ON "attendance_records" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_company_timestamp"
      ON "attendance_records" ("company_id", "timestamp")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_company_user_timestamp"
      ON "attendance_records" ("company_id", "user_id", "timestamp")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_attendance_records_device_id'
            AND conrelid = 'attendance_records'::regclass
        ) THEN
          ALTER TABLE "attendance_records"
            ADD CONSTRAINT "FK_attendance_records_device_id"
            FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_attendance_records_company_id'
            AND conrelid = 'attendance_records'::regclass
        ) THEN
          ALTER TABLE "attendance_records"
            ADD CONSTRAINT "FK_attendance_records_company_id"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        DROP CONSTRAINT IF EXISTS "FK_attendance_records_company_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        DROP CONSTRAINT IF EXISTS "FK_attendance_records_device_id"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_records_company_user_timestamp"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_records_company_timestamp"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_records_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_records_device_id"`);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        DROP COLUMN IF EXISTS "company_id",
        DROP COLUMN IF EXISTS "device_id"
    `);
  }
}

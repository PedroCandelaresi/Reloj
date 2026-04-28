import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDevicePunchStateAuditFields20260427000800 implements MigrationInterface {
  name = 'AddDevicePunchStateAuditFields20260427000800';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        ADD COLUMN IF NOT EXISTS "device_punch_state_raw" character varying,
        ADD COLUMN IF NOT EXISTS "device_punch_state_label" character varying,
        ADD COLUMN IF NOT EXISTS "raw_payload" text
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_records_device_punch_state_raw"
      ON "attendance_records" ("device_punch_state_raw")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_records_device_punch_state_raw"`);
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        DROP COLUMN IF EXISTS "raw_payload",
        DROP COLUMN IF EXISTS "device_punch_state_label",
        DROP COLUMN IF EXISTS "device_punch_state_raw"
    `);
  }
}

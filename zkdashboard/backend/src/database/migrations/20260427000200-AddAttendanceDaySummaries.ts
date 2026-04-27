import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceDaySummaries20260427000200 implements MigrationInterface {
  name = 'AddAttendanceDaySummaries20260427000200';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_day_summaries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "employee_id" character varying NOT NULL,
        "date" date NOT NULL,
        "first_punch_at" timestamp without time zone,
        "last_punch_at" timestamp without time zone,
        "total_punch_count" integer NOT NULL DEFAULT 0,
        "punch_times_json" jsonb,
        "device_ids_json" jsonb,
        "primary_device_id" integer,
        "primary_device_sn" character varying,
        "primary_device_name" character varying,
        "is_present" boolean NOT NULL DEFAULT false,
        "has_records" boolean NOT NULL DEFAULT false,
        "has_incomplete_record" boolean NOT NULL DEFAULT false,
        "worked_minutes" integer NOT NULL DEFAULT 0,
        "expected_minutes" integer NOT NULL DEFAULT 0,
        "late_minutes" integer NOT NULL DEFAULT 0,
        "early_departure_minutes" integer NOT NULL DEFAULT 0,
        "overtime_minutes" integer NOT NULL DEFAULT 0,
        "is_absent" boolean NOT NULL DEFAULT false,
        "is_holiday" boolean NOT NULL DEFAULT false,
        "is_weekend" boolean NOT NULL DEFAULT false,
        "status" character varying NOT NULL DEFAULT 'no_records',
        "calculated_at" timestamp without time zone,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_day_summaries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attendance_day_summaries_company_employee_date" UNIQUE ("company_id", "employee_id", "date")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_day_summaries_company_date"
      ON "attendance_day_summaries" ("company_id", "date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_day_summaries_company_employee_date"
      ON "attendance_day_summaries" ("company_id", "employee_id", "date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_day_summaries_date"
      ON "attendance_day_summaries" ("date")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_day_summaries_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_day_summaries_company_employee_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_day_summaries_company_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_day_summaries"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhase2SchedulesAndHolidays20260427000300 implements MigrationInterface {
  name = 'AddPhase2SchedulesAndHolidays20260427000300';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schedule_profiles"
        ADD COLUMN IF NOT EXISTS "late_tolerance_minutes" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "early_departure_tolerance_minutes" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "expected_minutes_per_day" integer,
        ADD COLUMN IF NOT EXISTS "work_days" jsonb,
        ADD COLUMN IF NOT EXISTS "break_minutes" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "overtime_after_minutes" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "holidays" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid,
        "date" date NOT NULL,
        "name" character varying(160) NOT NULL,
        "type" character varying NOT NULL DEFAULT 'national',
        "is_workable" boolean NOT NULL DEFAULT false,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_holidays" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_holidays_company_date"
      ON "holidays" ("company_id", "date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_holidays_date"
      ON "holidays" ("date")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_holidays_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_holidays_company_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "holidays"`);
    await queryRunner.query(`
      ALTER TABLE "schedule_profiles"
        DROP COLUMN IF EXISTS "overtime_after_minutes",
        DROP COLUMN IF EXISTS "break_minutes",
        DROP COLUMN IF EXISTS "work_days",
        DROP COLUMN IF EXISTS "expected_minutes_per_day",
        DROP COLUMN IF EXISTS "early_departure_tolerance_minutes",
        DROP COLUMN IF EXISTS "late_tolerance_minutes"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleProfileIntervalsRotationAndTimeBank20260429000400 implements MigrationInterface {
  name = 'AddScheduleProfileIntervalsRotationAndTimeBank20260429000400';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schedule_profiles"
        ADD COLUMN IF NOT EXISTS "rotation_mode" character varying(20) NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS "rotation_start_date" date,
        ADD COLUMN IF NOT EXISTS "rotation_length_weeks" integer,
        ADD COLUMN IF NOT EXISTS "rotation_length_days" integer,
        ADD COLUMN IF NOT EXISTS "time_bank_enabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "time_bank_mode" character varying(30) NOT NULL DEFAULT 'none'
    `);

    await queryRunner.query('DROP INDEX IF EXISTS "UQ_schedule_profile_day_rule"');
    await queryRunner.query(`
      ALTER TABLE "schedule_profile_day_rules"
        ALTER COLUMN "day_of_week" DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS "cycle_day" integer,
        ADD COLUMN IF NOT EXISTS "cycle_week" integer
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_profile_day_intervals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "day_rule_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "entry_time" character varying(5) NOT NULL,
        "exit_time" character varying(5) NOT NULL,
        "crosses_midnight" boolean NOT NULL DEFAULT false,
        "expected_minutes" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedule_profile_day_intervals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedule_profile_day_intervals_rule" FOREIGN KEY ("day_rule_id")
          REFERENCES "schedule_profile_day_rules"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_schedule_profile_day_intervals_rule_id"
        ON "schedule_profile_day_intervals" ("day_rule_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedule_profile_day_interval_sequence"
        ON "schedule_profile_day_intervals" ("day_rule_id", "sequence")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedule_profile_day_rule_lookup"
        ON "schedule_profile_day_rules" (
          "schedule_profile_id",
          "season",
          COALESCE("day_of_week", 0),
          COALESCE("cycle_day", 0),
          COALESCE("cycle_week", 0)
        )
    `);

    await queryRunner.query(`
      INSERT INTO "schedule_profile_day_intervals" (
        "day_rule_id",
        "sequence",
        "entry_time",
        "exit_time",
        "crosses_midnight",
        "expected_minutes"
      )
      SELECT
        rule."id",
        1,
        rule."entry_time",
        rule."exit_time",
        CASE WHEN rule."exit_time" < rule."entry_time" THEN true ELSE false END,
        NULL
      FROM "schedule_profile_day_rules" rule
      WHERE rule."is_workday" = true
        AND rule."entry_time" IS NOT NULL
        AND rule."exit_time" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "schedule_profile_day_intervals" existing
          WHERE existing."day_rule_id" = rule."id"
        )
    `);

    await queryRunner.query(`
      INSERT INTO "schedule_profile_day_intervals" (
        "day_rule_id",
        "sequence",
        "entry_time",
        "exit_time",
        "crosses_midnight",
        "expected_minutes"
      )
      SELECT
        rule."id",
        2,
        rule."second_entry_time",
        rule."second_exit_time",
        CASE WHEN rule."second_exit_time" < rule."second_entry_time" THEN true ELSE false END,
        NULL
      FROM "schedule_profile_day_rules" rule
      WHERE rule."is_workday" = true
        AND rule."is_split_shift" = true
        AND rule."second_entry_time" IS NOT NULL
        AND rule."second_exit_time" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "schedule_profile_day_intervals" existing
          WHERE existing."day_rule_id" = rule."id"
            AND existing."sequence" = 2
        )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employee_time_bank_ledger" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "employee_id" character varying NOT NULL,
        "date" date NOT NULL,
        "attendance_day_summary_id" uuid,
        "type" character varying(20) NOT NULL,
        "minutes" integer NOT NULL,
        "source" character varying(30) NOT NULL,
        "reason" text,
        "created_by_user_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_time_bank_ledger" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employee_time_bank_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employee_time_bank_summary" FOREIGN KEY ("attendance_day_summary_id")
          REFERENCES "attendance_day_summaries"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employee_time_bank_user" FOREIGN KEY ("created_by_user_id")
          REFERENCES "admin_users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employee_time_bank_ledger_company_employee_date"
        ON "employee_time_bank_ledger" ("company_id", "employee_id", "date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employee_time_bank_ledger_summary_source"
        ON "employee_time_bank_ledger" ("attendance_day_summary_id", "source")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // ADVERTENCIA: este rollback fallará si existen reglas de rotación con cycle_day o cycle_week,
    // porque ALTER COLUMN day_of_week SET NOT NULL rechaza filas con NULL en esa columna.
    // Antes de revertir en producción con datos de rotación, eliminá manualmente las reglas:
    //   DELETE FROM schedule_profile_day_rules WHERE cycle_day IS NOT NULL OR cycle_week IS NOT NULL;
    // Esta migración es prácticamente irreversible una vez que se crean perfiles de rotación.
    await queryRunner.query('DROP TABLE IF EXISTS "employee_time_bank_ledger"');
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_schedule_profile_day_rule_lookup"');
    await queryRunner.query('DROP TABLE IF EXISTS "schedule_profile_day_intervals"');
    await queryRunner.query(`
      ALTER TABLE "schedule_profile_day_rules"
        DROP COLUMN IF EXISTS "cycle_week",
        DROP COLUMN IF EXISTS "cycle_day",
        ALTER COLUMN "day_of_week" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "schedule_profiles"
        DROP COLUMN IF EXISTS "time_bank_mode",
        DROP COLUMN IF EXISTS "time_bank_enabled",
        DROP COLUMN IF EXISTS "rotation_length_days",
        DROP COLUMN IF EXISTS "rotation_length_weeks",
        DROP COLUMN IF EXISTS "rotation_start_date",
        DROP COLUMN IF EXISTS "rotation_mode"
    `);
  }
}

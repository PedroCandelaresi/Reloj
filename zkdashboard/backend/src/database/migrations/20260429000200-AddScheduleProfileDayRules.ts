import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleProfileDayRules20260429000200 implements MigrationInterface {
  name = 'AddScheduleProfileDayRules20260429000200';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_profile_day_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "schedule_profile_id" uuid NOT NULL,
        "day_of_week" integer NOT NULL,
        "season" character varying(12) NOT NULL DEFAULT 'normal',
        "is_workday" boolean NOT NULL DEFAULT true,
        "entry_time" character varying(5),
        "exit_time" character varying(5),
        "break_minutes" integer NOT NULL DEFAULT 0,
        "expected_minutes" integer,
        "late_tolerance_minutes" integer,
        "early_departure_tolerance_minutes" integer,
        "overtime_after_minutes" integer,
        "notes" text,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedule_profile_day_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedule_profile_day_rules_profile"
          FOREIGN KEY ("schedule_profile_id") REFERENCES "schedule_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_schedule_profile_day_rules_day"
          CHECK ("day_of_week" BETWEEN 1 AND 7),
        CONSTRAINT "CHK_schedule_profile_day_rules_season"
          CHECK ("season" IN ('normal', 'summer', 'winter')),
        CONSTRAINT "CHK_schedule_profile_day_rules_entry_time"
          CHECK ("entry_time" IS NULL OR "entry_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
        CONSTRAINT "CHK_schedule_profile_day_rules_exit_time"
          CHECK ("exit_time" IS NULL OR "exit_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedule_profile_day_rule"
      ON "schedule_profile_day_rules" ("schedule_profile_id", "day_of_week", "season")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_schedule_profile_day_rules_profile_id"
      ON "schedule_profile_day_rules" ("schedule_profile_id")
    `);

    await queryRunner.query(`
      INSERT INTO "schedule_profile_day_rules" (
        "schedule_profile_id",
        "day_of_week",
        "season",
        "is_workday",
        "entry_time",
        "exit_time",
        "break_minutes",
        "expected_minutes",
        "late_tolerance_minutes",
        "early_departure_tolerance_minutes",
        "overtime_after_minutes"
      )
      SELECT
        profile."id",
        day_data."day_of_week",
        'normal',
        day_data."is_workday",
        CASE WHEN day_data."is_workday" THEN profile."entry_time" ELSE NULL END,
        CASE WHEN day_data."is_workday" THEN profile."exit_time" ELSE NULL END,
        COALESCE(profile."break_minutes", 0),
        CASE WHEN day_data."is_workday" THEN profile."expected_minutes_per_day" ELSE 0 END,
        COALESCE(profile."late_tolerance_minutes", 0),
        COALESCE(profile."early_departure_tolerance_minutes", 0),
        COALESCE(profile."overtime_after_minutes", 0)
      FROM "schedule_profiles" profile
      CROSS JOIN LATERAL (
        SELECT
          day_number AS "day_of_week",
          CASE
            WHEN profile."work_days" IS NULL THEN day_number BETWEEN 1 AND 5
            ELSE profile."work_days" ? CASE day_number
              WHEN 1 THEN 'mon'
              WHEN 2 THEN 'tue'
              WHEN 3 THEN 'wed'
              WHEN 4 THEN 'thu'
              WHEN 5 THEN 'fri'
              WHEN 6 THEN 'sat'
              ELSE 'sun'
            END
          END AS "is_workday"
        FROM generate_series(1, 7) AS day_number
      ) day_data
      ON CONFLICT ("schedule_profile_id", "day_of_week", "season") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedule_profile_day_rules_profile_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_schedule_profile_day_rule"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_profile_day_rules"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSplitShiftToScheduleRules20260429000300 implements MigrationInterface {
  name = 'AddSplitShiftToScheduleRules20260429000300';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schedule_profile_day_rules"
        ADD COLUMN IF NOT EXISTS "is_split_shift" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "second_entry_time" character varying(5),
        ADD COLUMN IF NOT EXISTS "second_exit_time" character varying(5)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_schedule_profile_day_rules_second_entry_time'
            AND conrelid = 'schedule_profile_day_rules'::regclass
        ) THEN
          ALTER TABLE "schedule_profile_day_rules"
            ADD CONSTRAINT "CHK_schedule_profile_day_rules_second_entry_time"
            CHECK ("second_entry_time" IS NULL OR "second_entry_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_schedule_profile_day_rules_second_exit_time'
            AND conrelid = 'schedule_profile_day_rules'::regclass
        ) THEN
          ALTER TABLE "schedule_profile_day_rules"
            ADD CONSTRAINT "CHK_schedule_profile_day_rules_second_exit_time"
            CHECK ("second_exit_time" IS NULL OR "second_exit_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schedule_profile_day_rules"
        DROP CONSTRAINT IF EXISTS "CHK_schedule_profile_day_rules_second_exit_time",
        DROP CONSTRAINT IF EXISTS "CHK_schedule_profile_day_rules_second_entry_time",
        DROP COLUMN IF EXISTS "second_exit_time",
        DROP COLUMN IF EXISTS "second_entry_time",
        DROP COLUMN IF EXISTS "is_split_shift"
    `);
  }
}

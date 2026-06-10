import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleProfiles20260417000800 implements MigrationInterface {
  name = 'AddScheduleProfiles20260417000800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "entry_time" character varying(5) NOT NULL,
        "exit_time" character varying(5) NOT NULL,
        "summer_entry_time" character varying(5),
        "summer_exit_time" character varying(5),
        "summer_start" character varying(5),
        "summer_end" character varying(5),
        "winter_entry_time" character varying(5),
        "winter_exit_time" character varying(5),
        "winter_start" character varying(5),
        "winter_end" character varying(5),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_schedule_profiles_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedule_profiles_company_name"
        ON "schedule_profiles" ("company_id", "name")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_schedule_profiles_company_id"
        ON "schedule_profiles" ("company_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "schedule_profile_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employees_schedule_profile_id"
        ON "employees" ("schedule_profile_id")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_employees_schedule_profile'
            AND conrelid = 'employees'::regclass
        ) THEN
          ALTER TABLE "employees"
            ADD CONSTRAINT "FK_employees_schedule_profile"
            FOREIGN KEY ("schedule_profile_id") REFERENCES "schedule_profiles"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE column_name text;
      BEGIN
        FOREACH column_name IN ARRAY ARRAY[
          'entry_time',
          'exit_time',
          'summer_entry_time',
          'summer_exit_time',
          'winter_entry_time',
          'winter_exit_time'
        ]
        LOOP
          EXECUTE format(
            'ALTER TABLE "schedule_profiles"
             ADD CONSTRAINT "CHK_schedule_profiles_%s_24h"
             CHECK ("%s" IS NULL OR "%s" ~ ''^([01][0-9]|2[0-3]):[0-5][0-9]$'')',
            column_name,
            column_name,
            column_name
          );
        END LOOP;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE column_name text;
      BEGIN
        FOREACH column_name IN ARRAY ARRAY[
          'summer_start',
          'summer_end',
          'winter_start',
          'winter_end'
        ]
        LOOP
          EXECUTE format(
            'ALTER TABLE "schedule_profiles"
             ADD CONSTRAINT "CHK_schedule_profiles_%s_month_day"
             CHECK ("%s" IS NULL OR "%s" ~ ''^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'')',
            column_name,
            column_name,
            column_name
          );
        END LOOP;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP CONSTRAINT IF EXISTS "FK_employees_schedule_profile"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employees_schedule_profile_id"`);
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP COLUMN IF EXISTS "schedule_profile_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_profiles"`);
  }
}

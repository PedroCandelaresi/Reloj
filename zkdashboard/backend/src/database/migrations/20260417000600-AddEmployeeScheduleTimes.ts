import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeScheduleTimes20260417000600 implements MigrationInterface {
  name = 'AddEmployeeScheduleTimes20260417000600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "entry_time" character varying(5),
        ADD COLUMN IF NOT EXISTS "exit_time" character varying(5)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_employees_entry_time_24h'
            AND conrelid = 'employees'::regclass
        ) THEN
          ALTER TABLE "employees"
            ADD CONSTRAINT "CHK_employees_entry_time_24h"
            CHECK ("entry_time" IS NULL OR "entry_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_employees_exit_time_24h'
            AND conrelid = 'employees'::regclass
        ) THEN
          ALTER TABLE "employees"
            ADD CONSTRAINT "CHK_employees_exit_time_24h"
            CHECK ("exit_time" IS NULL OR "exit_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP CONSTRAINT IF EXISTS "CHK_employees_exit_time_24h"
    `);
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP CONSTRAINT IF EXISTS "CHK_employees_entry_time_24h"
    `);
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP COLUMN IF EXISTS "exit_time",
        DROP COLUMN IF EXISTS "entry_time"
    `);
  }
}

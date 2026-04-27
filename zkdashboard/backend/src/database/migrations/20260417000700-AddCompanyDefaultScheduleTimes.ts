import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyDefaultScheduleTimes20260417000700 implements MigrationInterface {
  name = 'AddCompanyDefaultScheduleTimes20260417000700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN IF NOT EXISTS "default_entry_time" character varying(5),
        ADD COLUMN IF NOT EXISTS "default_exit_time" character varying(5)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_companies_default_entry_time_24h'
            AND conrelid = 'companies'::regclass
        ) THEN
          ALTER TABLE "companies"
            ADD CONSTRAINT "CHK_companies_default_entry_time_24h"
            CHECK ("default_entry_time" IS NULL OR "default_entry_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_companies_default_exit_time_24h'
            AND conrelid = 'companies'::regclass
        ) THEN
          ALTER TABLE "companies"
            ADD CONSTRAINT "CHK_companies_default_exit_time_24h"
            CHECK ("default_exit_time" IS NULL OR "default_exit_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP CONSTRAINT IF EXISTS "CHK_companies_default_exit_time_24h"
    `);
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP CONSTRAINT IF EXISTS "CHK_companies_default_entry_time_24h"
    `);
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN IF EXISTS "default_exit_time",
        DROP COLUMN IF EXISTS "default_entry_time"
    `);
  }
}

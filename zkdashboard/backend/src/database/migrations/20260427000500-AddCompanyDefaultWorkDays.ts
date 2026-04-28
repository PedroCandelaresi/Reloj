import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyDefaultWorkDays20260427000500 implements MigrationInterface {
  name = 'AddCompanyDefaultWorkDays20260427000500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN IF NOT EXISTS "default_work_days" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN IF EXISTS "default_work_days"
    `);
  }
}

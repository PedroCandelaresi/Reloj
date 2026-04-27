import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactFieldsToCompaniesAndDevices20260427000100
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN IF NOT EXISTS "email"   character varying(200),
        ADD COLUMN IF NOT EXISTS "phone"   character varying(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "devices"
        ADD COLUMN IF NOT EXISTS "email"   character varying(200),
        ADD COLUMN IF NOT EXISTS "phone"   character varying(50),
        ADD COLUMN IF NOT EXISTS "address" character varying(300)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN IF EXISTS "email",
        DROP COLUMN IF EXISTS "phone"
    `);

    await queryRunner.query(`
      ALTER TABLE "devices"
        DROP COLUMN IF EXISTS "email",
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "address"
    `);
  }
}

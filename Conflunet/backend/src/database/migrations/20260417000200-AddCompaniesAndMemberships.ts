import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompaniesAndMemberships20260417000200 implements MigrationInterface {
  name = 'AddCompaniesAndMemberships20260417000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "cuit" character varying(11) NOT NULL,
        "razon_social" character varying(200) NOT NULL,
        "nombre_fantasia" character varying(200),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_companies_cuit"
      ON "companies" ("cuit")
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "company_id" uuid
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employees_company_id"
      ON "employees" ("company_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_users"
        ADD COLUMN IF NOT EXISTS "is_super_admin" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "employee_id" character varying
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_admin_users_employee_id"
      ON "admin_users" ("employee_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "admin_user_id" integer NOT NULL,
        "role" character varying(30) NOT NULL,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_memberships_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_company_memberships_company_id"
      ON "company_memberships" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_company_memberships_admin_user_id"
      ON "company_memberships" ("admin_user_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_company_memberships_company_user"
      ON "company_memberships" ("company_id", "admin_user_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_employees_company_id'
            AND conrelid = 'employees'::regclass
        ) THEN
          ALTER TABLE "employees"
            ADD CONSTRAINT "FK_employees_company_id"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_admin_users_employee_id'
            AND conrelid = 'admin_users'::regclass
        ) THEN
          ALTER TABLE "admin_users"
            ADD CONSTRAINT "FK_admin_users_employee_id"
            FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_company_memberships_company_id'
            AND conrelid = 'company_memberships'::regclass
        ) THEN
          ALTER TABLE "company_memberships"
            ADD CONSTRAINT "FK_company_memberships_company_id"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_company_memberships_admin_user_id'
            AND conrelid = 'company_memberships'::regclass
        ) THEN
          ALTER TABLE "company_memberships"
            ADD CONSTRAINT "FK_company_memberships_admin_user_id"
            FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE "admin_users"
      SET "is_super_admin" = true
      WHERE "id" = (
        SELECT "id"
        FROM "admin_users"
        ORDER BY "created_at" ASC, "id" ASC
        LIMIT 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "admin_users"
        WHERE "is_super_admin" = true
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "company_memberships"`);

    await queryRunner.query(`
      ALTER TABLE "admin_users"
        DROP CONSTRAINT IF EXISTS "FK_admin_users_employee_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_admin_users_employee_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_users"
        DROP COLUMN IF EXISTS "employee_id",
        DROP COLUMN IF EXISTS "is_super_admin"
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP CONSTRAINT IF EXISTS "FK_employees_company_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_employees_company_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP COLUMN IF EXISTS "company_id"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_companies_cuit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);
  }
}

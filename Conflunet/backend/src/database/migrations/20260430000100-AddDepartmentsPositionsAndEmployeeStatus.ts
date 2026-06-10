import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentsPositionsAndEmployeeStatus20260430000100 implements MigrationInterface {
  name = 'AddDepartmentsPositionsAndEmployeeStatus20260430000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_departments_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_departments_company_name"
        ON "departments" ("company_id", "name")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_departments_company_id"
        ON "departments" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "positions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_positions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_positions_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_positions_company_name"
        ON "positions" ("company_id", "name")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_positions_company_id"
        ON "positions" ("company_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "department_id" uuid,
        ADD COLUMN IF NOT EXISTS "position_id" uuid,
        ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "inactive_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "inactive_reason" text
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_employees_department'
        ) THEN
          ALTER TABLE "employees"
            ADD CONSTRAINT "FK_employees_department"
            FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_employees_position'
        ) THEN
          ALTER TABLE "employees"
            ADD CONSTRAINT "FK_employees_position"
            FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employees_department_id"
        ON "employees" ("department_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employees_position_id"
        ON "employees" ("position_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employees_company_active"
        ON "employees" ("company_id", "is_active")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_employees_company_active"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_employees_position_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_employees_department_id"');
    await queryRunner.query('ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "FK_employees_position"');
    await queryRunner.query('ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "FK_employees_department"');
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP COLUMN IF EXISTS "inactive_reason",
        DROP COLUMN IF EXISTS "inactive_at",
        DROP COLUMN IF EXISTS "is_active",
        DROP COLUMN IF EXISTS "position_id",
        DROP COLUMN IF EXISTS "department_id"
    `);
    await queryRunner.query('DROP TABLE IF EXISTS "positions"');
    await queryRunner.query('DROP TABLE IF EXISTS "departments"');
  }
}

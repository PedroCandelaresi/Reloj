import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceUserSnapshots20260427000700 implements MigrationInterface {
  name = 'AddDeviceUserSnapshots20260427000700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_user_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "device_id" integer NOT NULL,
        "pin" character varying(80) NOT NULL,
        "name" text,
        "privilege" character varying(50),
        "card" character varying(120),
        "password_present" boolean,
        "raw_data" jsonb,
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "matched_employee_id" character varying,
        "match_status" character varying(30) NOT NULL DEFAULT 'device_only',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_user_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_device_user_snapshots_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_device_user_snapshots_device" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_device_user_snapshots_employee" FOREIGN KEY ("matched_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_device_user_snapshots_device_pin"
      ON "device_user_snapshots" ("device_id", "pin")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_user_snapshots_company_status"
      ON "device_user_snapshots" ("company_id", "match_status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_user_snapshots_device_status"
      ON "device_user_snapshots" ("device_id", "match_status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_user_snapshots_last_seen"
      ON "device_user_snapshots" ("device_id", "last_seen_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_device_user_snapshots_last_seen"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_device_user_snapshots_device_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_device_user_snapshots_company_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_device_user_snapshots_device_pin"');
    await queryRunner.query('DROP TABLE IF EXISTS "device_user_snapshots"');
  }
}

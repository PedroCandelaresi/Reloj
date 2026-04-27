import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenDevicesAndAdmsIntake20260417000300 implements MigrationInterface {
  name = 'HardenDevicesAndAdmsIntake20260417000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "devices"
        ADD COLUMN IF NOT EXISTS "company_id" uuid,
        ADD COLUMN IF NOT EXISTS "alias" character varying(150),
        ADD COLUMN IF NOT EXISTS "assigned_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "first_seen" timestamp without time zone
    `);

    await queryRunner.query(`
      UPDATE "devices"
      SET "first_seen" = COALESCE("first_seen", "last_seen", now())
      WHERE "first_seen" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "devices"
        ALTER COLUMN "first_seen" SET DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "devices"
        ALTER COLUMN "first_seen" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_devices_company_id"
      ON "devices" ("company_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_devices_company_id'
            AND conrelid = 'devices'::regclass
        ) THEN
          ALTER TABLE "devices"
            ADD CONSTRAINT "FK_devices_company_id"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "device_commands"
        ADD COLUMN IF NOT EXISTS "company_id" uuid
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_commands_company_id"
      ON "device_commands" ("company_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_device_commands_company_id'
            AND conrelid = 'device_commands'::regclass
        ) THEN
          ALTER TABLE "device_commands"
            ADD CONSTRAINT "FK_device_commands_company_id"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_requests" (
        "id" BIGSERIAL NOT NULL,
        "device_id" integer,
        "serial_number" character varying(120),
        "company_id" uuid,
        "source_ip" character varying(64),
        "method" character varying(10) NOT NULL,
        "path" character varying(200) NOT NULL,
        "query_raw" text,
        "body_raw" text,
        "response_status" integer,
        "processed_ok" boolean,
        "parse_error" text,
        "received_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inbound_requests_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_requests_device_id"
      ON "inbound_requests" ("device_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_requests_serial_number"
      ON "inbound_requests" ("serial_number")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_requests_company_id"
      ON "inbound_requests" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_requests_received_at"
      ON "inbound_requests" ("received_at")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_inbound_requests_device_id'
            AND conrelid = 'inbound_requests'::regclass
        ) THEN
          ALTER TABLE "inbound_requests"
            ADD CONSTRAINT "FK_inbound_requests_device_id"
            FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_inbound_requests_company_id'
            AND conrelid = 'inbound_requests'::regclass
        ) THEN
          ALTER TABLE "inbound_requests"
            ADD CONSTRAINT "FK_inbound_requests_company_id"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_requests"`);

    await queryRunner.query(`
      ALTER TABLE "device_commands"
        DROP CONSTRAINT IF EXISTS "FK_device_commands_company_id"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_device_commands_company_id"`);
    await queryRunner.query(`
      ALTER TABLE "device_commands"
        DROP COLUMN IF EXISTS "company_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "devices"
        DROP CONSTRAINT IF EXISTS "FK_devices_company_id"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_devices_company_id"`);
    await queryRunner.query(`
      ALTER TABLE "devices"
        DROP COLUMN IF EXISTS "first_seen",
        DROP COLUMN IF EXISTS "assigned_at",
        DROP COLUMN IF EXISTS "alias",
        DROP COLUMN IF EXISTS "company_id"
    `);
  }
}

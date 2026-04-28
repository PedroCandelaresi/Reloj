import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandDeviceCommandsForPhase420260427000600 implements MigrationInterface {
  name = 'ExpandDeviceCommandsForPhase420260427000600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "device_commands"
      ADD COLUMN IF NOT EXISTS "payload" jsonb,
      ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "max_attempts" integer NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS "last_attempt_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "failed_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "result_code" character varying(50),
      ADD COLUMN IF NOT EXISTS "result_raw" text,
      ADD COLUMN IF NOT EXISTS "error_message" text,
      ADD COLUMN IF NOT EXISTS "created_by_user_id" integer,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_commands_company_status"
      ON "device_commands" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_commands_last_attempt"
      ON "device_commands" ("status", "last_attempt_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_device_commands_last_attempt"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_device_commands_company_status"');
    await queryRunner.query(`
      ALTER TABLE "device_commands"
      DROP COLUMN IF EXISTS "updated_at",
      DROP COLUMN IF EXISTS "created_by_user_id",
      DROP COLUMN IF EXISTS "error_message",
      DROP COLUMN IF EXISTS "result_raw",
      DROP COLUMN IF EXISTS "result_code",
      DROP COLUMN IF EXISTS "expires_at",
      DROP COLUMN IF EXISTS "failed_at",
      DROP COLUMN IF EXISTS "last_attempt_at",
      DROP COLUMN IF EXISTS "max_attempts",
      DROP COLUMN IF EXISTS "attempts",
      DROP COLUMN IF EXISTS "payload"
    `);
  }
}

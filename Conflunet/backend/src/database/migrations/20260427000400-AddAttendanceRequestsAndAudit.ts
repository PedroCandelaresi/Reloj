import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceRequestsAndAudit20260427000400 implements MigrationInterface {
  name = 'AddAttendanceRequestsAndAudit20260427000400';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        ADD COLUMN IF NOT EXISTS "source" character varying NOT NULL DEFAULT 'device'
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_day_summaries"
        ADD COLUMN IF NOT EXISTS "justification_status" character varying NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS "justification_request_id" uuid,
        ADD COLUMN IF NOT EXISTS "notes" character varying
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "employee_id" character varying NOT NULL,
        "requested_by_user_id" integer NOT NULL,
        "reviewed_by_user_id" integer,
        "type" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "date" date NOT NULL,
        "punch_time" timestamp without time zone,
        "punch_type" character varying,
        "target_attendance_record_id" integer,
        "old_punch_time" timestamp without time zone,
        "new_punch_time" timestamp without time zone,
        "reason" text NOT NULL,
        "review_notes" text,
        "reviewed_at" timestamp without time zone,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_requests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_requests_company_date"
      ON "attendance_requests" ("company_id", "date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_requests_company_status"
      ON "attendance_requests" ("company_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_requests_company_type"
      ON "attendance_requests" ("company_id", "type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_requests_company_employee"
      ON "attendance_requests" ("company_id", "employee_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "employee_id" character varying,
        "attendance_record_id" integer,
        "attendance_request_id" uuid,
        "action" character varying NOT NULL,
        "old_value" jsonb,
        "new_value" jsonb,
        "performed_by_user_id" integer NOT NULL,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_audit_logs_company_created"
      ON "attendance_audit_logs" ("company_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_audit_logs_company_employee"
      ON "attendance_audit_logs" ("company_id", "employee_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_audit_logs_company_action"
      ON "attendance_audit_logs" ("company_id", "action")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_audit_logs_request"
      ON "attendance_audit_logs" ("attendance_request_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_audit_logs_request"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_audit_logs_company_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_audit_logs_company_employee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_audit_logs_company_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_audit_logs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_requests_company_employee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_requests_company_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_requests_company_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_requests_company_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_requests"`);

    await queryRunner.query(`
      ALTER TABLE "attendance_day_summaries"
        DROP COLUMN IF EXISTS "notes",
        DROP COLUMN IF EXISTS "justification_request_id",
        DROP COLUMN IF EXISTS "justification_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
        DROP COLUMN IF EXISTS "source"
    `);
  }
}

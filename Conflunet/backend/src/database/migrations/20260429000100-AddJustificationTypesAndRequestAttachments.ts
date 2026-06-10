import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJustificationTypesAndRequestAttachments20260429000100 implements MigrationInterface {
  name = 'AddJustificationTypesAndRequestAttachments20260429000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_justification_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid,
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "applies_to" character varying NOT NULL,
        "is_paid" boolean NOT NULL DEFAULT false,
        "requires_attachment" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_justification_types" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_justification_types_company_active"
      ON "attendance_justification_types" ("company_id", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_justification_types_applies_to"
      ON "attendance_justification_types" ("applies_to")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_attendance_justification_types_global_code"
      ON "attendance_justification_types" ("code") WHERE "company_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_attendance_justification_types_company_code"
      ON "attendance_justification_types" ("company_id", "code") WHERE "company_id" IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "attendance_justification_types"
        ("code", "name", "description", "applies_to", "is_paid", "requires_attachment", "is_active")
      VALUES
        ('medical_leave', 'Licencia médica', 'Ausencia por enfermedad o atención médica.', 'absence', true, true, true),
        ('vacation', 'Vacaciones', 'Día de vacaciones autorizado por la empresa.', 'absence', true, false, true),
        ('authorized_permission', 'Permiso autorizado', 'Permiso aprobado por RRHH o responsable.', 'general', true, false, true),
        ('personal_errand', 'Trámite personal', 'Ausencia o demora por trámite personal.', 'general', false, false, true),
        ('work_accident', 'Accidente laboral', 'Ausencia vinculada a accidente laboral.', 'absence', true, true, true),
        ('family_leave', 'Licencia familiar', 'Licencia por motivo familiar.', 'absence', true, true, true),
        ('unjustified_absence', 'Ausencia injustificada', 'Ausencia sin justificación aprobada.', 'absence', false, false, true),
        ('justified_late_arrival', 'Llegada tarde justificada', 'Tardanza con motivo aprobado por RRHH.', 'late', false, false, true),
        ('punch_error', 'Error de fichada', 'La marcación original tuvo un error.', 'punch_correction', false, false, true),
        ('device_issue', 'Problema del reloj', 'El reloj no registró correctamente la marcación.', 'manual_punch', false, false, true)
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_requests"
        ADD COLUMN IF NOT EXISTS "justification_type_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_requests_justification_type"
      ON "attendance_requests" ("justification_type_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_request_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "attendance_request_id" uuid NOT NULL,
        "uploaded_by_user_id" integer NOT NULL,
        "original_name" character varying NOT NULL,
        "stored_name" character varying NOT NULL,
        "mime_type" character varying NOT NULL,
        "size_bytes" integer NOT NULL,
        "storage_path" character varying NOT NULL,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_request_attachments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_request_attachments_company_request"
      ON "attendance_request_attachments" ("company_id", "attendance_request_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_request_attachments_company_request"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_request_attachments"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_requests_justification_type"`);
    await queryRunner.query(`ALTER TABLE "attendance_requests" DROP COLUMN IF EXISTS "justification_type_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_attendance_justification_types_company_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_attendance_justification_types_global_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_justification_types_applies_to"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_justification_types_company_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_justification_types"`);
  }
}

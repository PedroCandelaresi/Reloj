import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialBaseline20260417000100 implements MigrationInterface {
  name = 'InitialBaseline20260417000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_users" (
        "id" SERIAL NOT NULL,
        "username" character varying NOT NULL,
        "nombre" character varying,
        "apellido" character varying,
        "dni" character varying,
        "telefono" character varying,
        "email" character varying,
        "password_hash" character varying NOT NULL,
        "created_at" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_2873882c38e8c07d98cb64f962d" UNIQUE ("username")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_users"
        ADD COLUMN IF NOT EXISTS "nombre" character varying,
        ADD COLUMN IF NOT EXISTS "apellido" character varying,
        ADD COLUMN IF NOT EXISTS "dni" character varying,
        ADD COLUMN IF NOT EXISTS "telefono" character varying,
        ADD COLUMN IF NOT EXISTS "email" character varying
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employees" (
        "id" character varying NOT NULL,
        "nombre" character varying NOT NULL,
        "apellido" character varying NOT NULL,
        "telefono" character varying,
        "email" character varying,
        "created_at" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "telefono" character varying,
        ADD COLUMN IF NOT EXISTS "email" character varying
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "devices" (
        "id" SERIAL NOT NULL,
        "serial_number" character varying NOT NULL,
        "ip_address" character varying,
        "is_active" boolean DEFAULT true NOT NULL,
        "last_seen" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cc9e89897e336172fd06367735d" UNIQUE ("serial_number")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "devices"
        ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_records" (
        "id" SERIAL NOT NULL,
        "device_sn" character varying NOT NULL,
        "user_id" character varying NOT NULL,
        "timestamp" timestamp without time zone NOT NULL,
        "status" integer NOT NULL,
        "verify_type" integer NOT NULL,
        "work_code" character varying,
        "created_at" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_946920332f5bc9efad3f3023b96" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_c433690e3654b4ad8a644c3a02"
      ON "attendance_records" ("device_sn")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_10e9fc7100cb48ace47a91ee1c"
      ON "attendance_records" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_069ed4a2932c2a540fcfdbeda2"
      ON "attendance_records" ("timestamp")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_commands" (
        "id" SERIAL NOT NULL,
        "device_id" integer NOT NULL,
        "command_type" character varying(50) NOT NULL,
        "command" text NOT NULL,
        "status" character varying(30) DEFAULT 'pending' NOT NULL,
        "requested_by" character varying(120),
        "requested_at" timestamp without time zone DEFAULT now() NOT NULL,
        "sent_at" timestamp with time zone,
        "acknowledged_at" timestamp with time zone,
        "response_payload" text,
        "error" text,
        CONSTRAINT "PK_08a3f976a83bbf1754fbf4088c7" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "device_commands"
        ADD COLUMN IF NOT EXISTS "response_payload" text,
        ADD COLUMN IF NOT EXISTS "error" text
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_commands_device_status"
      ON "device_commands" ("device_id", "status")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_ec7250b29b943067213ca5677dd'
            AND conrelid = 'device_commands'::regclass
        ) THEN
          ALTER TABLE "device_commands"
            ADD CONSTRAINT "FK_ec7250b29b943067213ca5677dd"
            FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'Initial baseline migration is intentionally irreversible. Use a backup restore if rollback is required.',
    );
  }
}

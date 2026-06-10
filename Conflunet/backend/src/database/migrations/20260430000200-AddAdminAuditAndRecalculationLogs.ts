import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAdminAuditAndRecalculationLogs1714435200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create attendance_recalculation_logs table
    await queryRunner.createTable(
      new Table({
        name: 'attendance_recalculation_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'company_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'requested_by_user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'date_from',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'date_to',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'employee_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'running'",
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'finished_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'processed_employees',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'processed_days',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'attendance_recalculation_logs',
      new TableIndex({
        name: 'IDX_recalc_logs_company_id',
        columnNames: ['company_id'],
      }),
    );

    await queryRunner.createIndex(
      'attendance_recalculation_logs',
      new TableIndex({
        name: 'IDX_recalc_logs_company_requested',
        columnNames: ['company_id', 'requested_by_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'attendance_recalculation_logs',
      new TableIndex({
        name: 'IDX_recalc_logs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'attendance_recalculation_logs',
      new TableIndex({
        name: 'IDX_recalc_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create admin_config_audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'admin_config_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'company_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '60',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '60',
            isNullable: false,
          },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'before_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'after_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'change_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'admin_config_audit_logs',
      new TableIndex({
        name: 'IDX_config_audit_company_id',
        columnNames: ['company_id'],
      }),
    );

    await queryRunner.createIndex(
      'admin_config_audit_logs',
      new TableIndex({
        name: 'IDX_config_audit_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'admin_config_audit_logs',
      new TableIndex({
        name: 'IDX_config_audit_action',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'admin_config_audit_logs',
      new TableIndex({
        name: 'IDX_config_audit_entity',
        columnNames: ['entity_type', 'entity_id'],
      }),
    );

    await queryRunner.createIndex(
      'admin_config_audit_logs',
      new TableIndex({
        name: 'IDX_config_audit_company_created',
        columnNames: ['company_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_config_audit_logs', true);
    await queryRunner.dropTable('attendance_recalculation_logs', true);
  }
}

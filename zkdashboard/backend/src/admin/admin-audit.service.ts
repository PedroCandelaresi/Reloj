import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, IsNull } from 'typeorm';
import { AttendanceRecalculationLog } from './entities/attendance-recalculation-log.entity';
import { AdminConfigAuditLog, AdminConfigAuditAction } from './entities/admin-config-audit-log.entity';

export interface RecalculationSummary {
  total: number;
  completed: number;
  failed: number;
  running: number;
  avgDurationMs: number | null;
}

export interface ConfigAuditSummary {
  total: number;
  byAction: Record<AdminConfigAuditAction, number>;
  last24h: number;
  byEntityType: Record<string, number>;
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AttendanceRecalculationLog)
    private readonly recalcLogsRepo: Repository<AttendanceRecalculationLog>,
    @InjectRepository(AdminConfigAuditLog)
    private readonly configAuditRepo: Repository<AdminConfigAuditLog>,
  ) {}

  // ─── Recalculation Logging ────────────────────────────────────────────────

  async logRecalculationStart(
    companyId: string,
    requestedByUserId: number,
    dateFrom: string,
    dateTo: string,
    employeeId?: string | null,
  ): Promise<AttendanceRecalculationLog> {
    return this.recalcLogsRepo.save(
      this.recalcLogsRepo.create({
        companyId,
        requestedByUserId,
        dateFrom,
        dateTo,
        employeeId: employeeId ?? null,
        status: 'running',
        startedAt: new Date(),
      }),
    );
  }

  async logRecalculationComplete(
    logId: string,
    processedEmployees: number,
    processedDays: number,
  ): Promise<AttendanceRecalculationLog> {
    const log = await this.recalcLogsRepo.findOneByOrFail({ id: logId });
    log.status = 'completed';
    log.processedEmployees = processedEmployees;
    log.processedDays = processedDays;
    log.finishedAt = new Date();
    return this.recalcLogsRepo.save(log);
  }

  async logRecalculationFailed(
    logId: string,
    errorMessage: string,
  ): Promise<AttendanceRecalculationLog> {
    const log = await this.recalcLogsRepo.findOneByOrFail({ id: logId });
    log.status = 'failed';
    log.errorMessage = errorMessage;
    log.finishedAt = new Date();
    return this.recalcLogsRepo.save(log);
  }

  async getRecalculationSummary(
    companyId?: string,
    status?: 'running' | 'completed' | 'failed',
    limit: number = 100,
  ): Promise<{ recent: AttendanceRecalculationLog[]; summary: RecalculationSummary }> {
    const qb = this.recalcLogsRepo
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .take(limit);

    if (companyId) {
      qb.where('log.company_id = :companyId', { companyId });
    }

    if (status) {
      qb.andWhere('log.status = :status', { status });
    }

    const recent = await qb.getMany();

    const completed = recent.filter((r) => r.status === 'completed');
    const failed = recent.filter((r) => r.status === 'failed');
    const running = recent.filter((r) => r.status === 'running');

    const durations = completed
      .map((r) => r.finishedAt && (r.finishedAt.getTime() - r.startedAt.getTime()))
      .filter(Boolean) as number[];

    return {
      recent,
      summary: {
        total: recent.length,
        completed: completed.length,
        failed: failed.length,
        running: running.length,
        avgDurationMs: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : null,
      },
    };
  }

  // ─── Config Audit Logging ─────────────────────────────────────────────────

  async logConfigChange(
    companyId: string,
    action: AdminConfigAuditAction,
    entityType: string,
    entityId: string,
    beforeValue?: Record<string, unknown> | null,
    afterValue?: Record<string, unknown> | null,
    changeDescription?: string,
    userId?: number | null,
  ): Promise<AdminConfigAuditLog> {
    return this.configAuditRepo.save(
      this.configAuditRepo.create({
        companyId,
        action,
        entityType,
        entityId,
        beforeValue: beforeValue ?? null,
        afterValue: afterValue ?? null,
        changeDescription: changeDescription ?? null,
        userId: userId ?? null,
      }),
    );
  }

  async getConfigAuditLog(
    companyId: string,
    entityType?: string,
    action?: AdminConfigAuditAction,
    status?: 'running' | 'completed' | 'failed',
    dateFrom?: string,
    dateTo?: string,
    limit: number = 100,
  ): Promise<AdminConfigAuditLog[]> {
    const qb = this.configAuditRepo
      .createQueryBuilder('audit')
      .where('audit.company_id = :companyId', { companyId })
      .orderBy('audit.created_at', 'DESC')
      .take(limit);

    if (entityType) {
      qb.andWhere('audit.entity_type = :entityType', { entityType });
    }

    if (action) {
      qb.andWhere('audit.action = :action', { action });
    }

    if (dateFrom) {
      qb.andWhere('audit.created_at >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('audit.created_at <= :dateTo', { dateTo });
    }

    return qb.getMany();
  }

  async getConfigAuditSummary(companyId: string): Promise<ConfigAuditSummary> {
    const allLogs = await this.configAuditRepo.find({ where: { companyId } });
    const last24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24h = await this.configAuditRepo.find({
      where: {
        companyId,
        createdAt: Between(last24hAgo, new Date()),
      },
    });

    const byAction: Record<AdminConfigAuditAction, number> = {} as any;
    const byEntityType: Record<string, number> = {};

    for (const log of allLogs) {
      byAction[log.action] = (byAction[log.action] ?? 0) + 1;
      byEntityType[log.entityType] = (byEntityType[log.entityType] ?? 0) + 1;
    }

    return {
      total: allLogs.length,
      byAction,
      last24h: last24h.length,
      byEntityType,
    };
  }
}

import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService, SupportOverview } from './support.service';
import { AdminAuditService, RecalculationSummary, ConfigAuditSummary } from './admin-audit.service';
import { SuperAdminOnly } from '../auth/guards/super-admin-only.guard';

@Controller('admin/support')
@UseGuards(AuthGuard('jwt'), SuperAdminOnly)
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get('overview')
  async getOverview(): Promise<SupportOverview> {
    return this.supportService.getOverview();
  }

  @Get('devices')
  async getDevices(
    @Query('state') state: string = 'all',
  ): Promise<{
    state: string;
    count: number;
    devices: Array<{
      id: number;
      serialNumber: string;
      companyId: string;
      lastSeen: Date | null;
      isActive: boolean;
      firstSeen: Date;
    }>;
  }> {
    const validStates = ['all', 'online', 'idle', 'offline', 'never_seen', 'disabled'];
    if (!validStates.includes(state)) {
      throw new BadRequestException(`Invalid state. Must be one of: ${validStates.join(', ')}`);
    }

    const devices = await this.supportService.getDevicesByState(state);

    return {
      state,
      count: devices.length,
      devices: devices.map((d) => ({
        id: d.id,
        serialNumber: d.serialNumber,
        companyId: d.companyId,
        lastSeen: d.lastSeen,
        isActive: d.isActive,
        firstSeen: d.firstSeen,
      })),
    };
  }

  @Get('company/:companyId/devices')
  async getCompanyDevices(
    @Param('companyId') companyId: string,
  ): Promise<{
    companyId: string;
    companyName: string;
    summary: {
      total: number;
      online: number;
      offline: number;
    };
    devices: Array<{
      id: number;
      serialNumber: string;
      lastSeen: Date | null;
      isActive: boolean;
    }>;
  }> {
    const data = await this.supportService.getCompanyDevicesStatus(companyId);

    return {
      companyId: data.company.id,
      companyName: data.company.razonSocial,
      summary: data.summary,
      devices: data.devices.map((d) => ({
        id: d.id,
        serialNumber: d.serialNumber,
        lastSeen: d.lastSeen,
        isActive: d.isActive,
      })),
    };
  }

  @Get('recalculations')
  async getRecalculations(
    @Query('companyId') companyId?: string,
    @Query('limit') limitStr?: string,
  ): Promise<{
    summary: RecalculationSummary;
    logs: Array<{
      id: string;
      companyId: string;
      dateFrom: string;
      dateTo: string;
      employeeId: string | null;
      status: string;
      startedAt: Date;
      finishedAt: Date | null;
      processedEmployees: number | null;
      processedDays: number | null;
      errorMessage: string | null;
    }>;
  }> {
    const limit = limitStr ? Math.min(parseInt(limitStr, 10), 500) : 100;
    const { recent, summary } = await this.auditService.getRecalculationSummary(companyId, undefined, limit);

    return {
      summary,
      logs: recent.map((log) => ({
        id: log.id,
        companyId: log.companyId,
        dateFrom: log.dateFrom,
        dateTo: log.dateTo,
        employeeId: log.employeeId,
        status: log.status,
        startedAt: log.startedAt,
        finishedAt: log.finishedAt,
        processedEmployees: log.processedEmployees,
        processedDays: log.processedDays,
        errorMessage: log.errorMessage,
      })),
    };
  }

  @Get('config-audit')
  async getConfigAudit(
    @Query('companyId') companyId: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('limit') limitStr?: string,
  ): Promise<{
    summary: ConfigAuditSummary;
    logs: Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      changeDescription: string | null;
      beforeValue: Record<string, unknown> | null;
      afterValue: Record<string, unknown> | null;
      createdAt: Date;
    }>;
  }> {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    const limit = limitStr ? Math.min(parseInt(limitStr, 10), 500) : 100;
    const logs = await this.auditService.getConfigAuditLog(
      companyId,
      entityType,
      action as any,
      undefined,
      undefined,
      undefined,
      limit,
    );
    const summary = await this.auditService.getConfigAuditSummary(companyId);

    return {
      summary,
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changeDescription: log.changeDescription,
        beforeValue: log.beforeValue,
        afterValue: log.afterValue,
        createdAt: log.createdAt,
      })),
    };
  }
}

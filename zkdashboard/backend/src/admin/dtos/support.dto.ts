export class SupportOverviewDto {
  global: {
    totalCompanies: number;
    activeCompanies: number;
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    neverSeenDevices: number;
    deviceStates: Record<string, number>;
  };
  commands: {
    pendingCount: number;
    failedCount: number;
    expiredCount: number;
    recentFailed: Array<{
      id: number;
      deviceId: number;
      deviceSn: string;
      command: string;
      status: string;
      error: string | null;
      failedAt: Date | null;
    }>;
  };
  communication: {
    lastInboundRequestAt: Date | null;
    totalInboundRequests24h: number;
    failedRequests24h: number;
    avgResponseTime: number | null;
  };
  recalculation: {
    running: number;
    failed: number;
    recentFailed: Array<{
      id: string;
      companyId: string;
      dateFrom: string;
      dateTo: string;
      errorMessage: string | null;
      createdAt: Date;
    }>;
  };
  issues: string[];
}

export class RecalculationLogDto {
  id: string;
  companyId: string;
  dateFrom: string;
  dateTo: string;
  employeeId: string | null;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  finishedAt: Date | null;
  processedEmployees: number | null;
  processedDays: number | null;
  errorMessage: string | null;
  createdAt: Date;
}

export class ConfigAuditLogDto {
  id: string;
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  changeDescription: string | null;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  createdAt: Date;
}

export class DeviceStatusDto {
  id: number;
  serialNumber: string;
  companyId: string;
  lastSeen: Date | null;
  isActive: boolean;
  createdAt: Date;
  state?: 'online' | 'idle' | 'offline' | 'never_seen' | 'disabled';
}

export class CompanyDevicesSummaryDto {
  companyId: string;
  companyName: string;
  summary: {
    total: number;
    online: number;
    offline: number;
  };
  devices: DeviceStatusDto[];
}

export class AlertDto {
  type: 'device_offline' | 'device_never_seen' | 'command_failed' | 'recalc_failed' | 'no_devices';
  severity: 'high' | 'medium' | 'low';
  message: string;
  count?: number;
  timestamp: Date;
}

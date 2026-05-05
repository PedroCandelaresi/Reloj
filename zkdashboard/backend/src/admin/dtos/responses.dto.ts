export class DevicesResponseDto {
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
}

export class CompanyDevicesResponseDto {
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
}

export class RecalculationsResponseDto {
  summary: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    avgDurationMs: number | null;
  };
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
}

export class ConfigAuditResponseDto {
  summary: {
    total: number;
    byAction: Record<string, number>;
    last24h: number;
    byEntityType: Record<string, number>;
  };
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
}

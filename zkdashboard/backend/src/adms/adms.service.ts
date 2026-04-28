import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceService } from '../attendance/attendance.service';
import { Device } from '../devices/device.entity';
import { DevicesService } from '../devices/devices.service';
import { InboundRequest } from './inbound-request.entity';
import { logAttendance, logSecurity } from '../logging/file-log.util';

export interface AdmsProcessResult {
  body: string;
  device: Device | null;
  processedOk: boolean;
  parseError?: string | null;
}

const DEVICE_PUNCH_STATE_LABELS: Record<number, string> = {
  0: 'Entrada informada por reloj',
  1: 'Salida informada por reloj',
  2: 'Salida a descanso informada por reloj',
  3: 'Entrada de descanso informada por reloj',
  4: 'Entrada extra informada por reloj',
  5: 'Salida extra informada por reloj',
};

function devicePunchStateLabel(rawValue: string): string | null {
  const numericValue = Number.parseInt(rawValue, 10);
  if (Number.isFinite(numericValue) && DEVICE_PUNCH_STATE_LABELS[numericValue]) {
    return DEVICE_PUNCH_STATE_LABELS[numericValue];
  }

  const normalized = rawValue.trim();
  return normalized ? `Estado informado por reloj: ${normalized}` : null;
}

function normalizeDevicePunchState(rawValue: string): number {
  const numericValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function isDeviceOvertimeState(rawValue: string | null | undefined): boolean {
  const normalized = `${rawValue ?? ''}`.trim().toUpperCase();
  return ['4', '5', 'OT', 'OVERTIME', 'EXTRA', 'ENTRADA EXTRA', 'SALIDA EXTRA'].includes(normalized);
}

@Injectable()
export class AdmsService {
  private readonly logger = new Logger(AdmsService.name);

  constructor(
    @InjectRepository(InboundRequest)
    private readonly inboundRequestsRepo: Repository<InboundRequest>,
    private readonly attendance: AttendanceService,
    private readonly devices: DevicesService,
  ) {}

  async startInboundRequest(params: {
    serialNumber?: string | null;
    sourceIp?: string | null;
    method: string;
    path: string;
    queryRaw?: string | null;
    bodyRaw?: string | null;
  }): Promise<InboundRequest> {
    return this.inboundRequestsRepo.save(
      this.inboundRequestsRepo.create({
        serialNumber: this.normalizeSerialNumber(params.serialNumber),
        sourceIp: params.sourceIp?.trim() || null,
        method: params.method.trim().toUpperCase().slice(0, 10),
        path: params.path.trim().slice(0, 200),
        queryRaw: params.queryRaw?.trim() || null,
        bodyRaw: params.bodyRaw ?? null,
        processedOk: null,
        parseError: null,
        responseStatus: null,
      }),
    );
  }

  async completeInboundRequest(
    inboundRequestId: string,
    result: {
      serialNumber?: string | null;
      deviceId?: number | null;
      companyId?: string | null;
      responseStatus: number;
      processedOk: boolean;
      parseError?: string | null;
    },
  ): Promise<void> {
    await this.inboundRequestsRepo.update(inboundRequestId, {
      serialNumber: this.normalizeSerialNumber(result.serialNumber),
      deviceId: result.deviceId ?? null,
      companyId: result.companyId ?? null,
      responseStatus: result.responseStatus,
      processedOk: result.processedOk,
      parseError: result.parseError?.trim() || null,
    });
  }

  async handleInit(serialNumber: string, ipAddress: string): Promise<AdmsProcessResult> {
    const device = await this.devices.upsert(serialNumber, ipAddress);
    this.logger.log(`Dispositivo conectado: ${serialNumber} (${ipAddress})`);

    // Respuesta requerida por el protocolo ADMS
    return {
      body: [
        `GET OPTION FROM: ${serialNumber}`,
        'ATTLOGStamp=None',
        'OPERLOGStamp=None',
        'ATTPHOTOStamp=None',
        'ErrorDelay=30',
        'Delay=10',
        'TransTimes=00:00;14:05',
        'TransInterval=1',
        'TransFlag=TransData AttLog OpLog',
        'TimeZone=-3',
        'Realtime=1',
        'Encrypt=None',
        '',
      ].join('\n'),
      device,
      processedOk: true,
    };
  }

  async handlePush(
    serialNumber: string,
    table: string,
    body: string,
    ipAddress: string,
    method: string,
    path: string,
  ): Promise<AdmsProcessResult> {
    logAttendance({
      ipAddress,
      serialNumber,
      table,
      method,
      path,
      body,
    });

    if (table !== 'ATTLOG') {
      const device = await this.devices.upsert(serialNumber, ipAddress);
      const normalizedTable = table?.trim().toUpperCase();
      if (normalizedTable === 'USERINFO' && device.companyId) {
        const result = await this.devices.importUserInfoSnapshotFromPush(device, body);
        this.logger.log(
          `USERINFO registrado desde ${serialNumber}: snapshots=${result.upserted} omitidos=${result.skipped}`,
        );
      }
      await this.devices.markDeviceDataQueryFromPush(serialNumber, table, body);
      return {
        body: 'OK',
        device,
        processedOk: true,
      };
    }

    const existingDevice = await this.devices.findBySerialNumber(serialNumber);
    if (!existingDevice) {
      const message = 'ATTLOG rechazado: dispositivo no registrado.';
      this.logger.warn(`${message} sn=${serialNumber || '-'}`);
      logSecurity({
        event: 'adms_attlog_rejected',
        message,
        ipAddress,
        method,
        path,
        serialNumber,
      });

      return {
        body: 'OK',
        device: null,
        processedOk: false,
        parseError: message,
      };
    }

    if (!existingDevice.companyId) {
      const message = 'ATTLOG rechazado: dispositivo sin empresa asignada.';
      this.logger.warn(`${message} sn=${existingDevice.serialNumber}`);
      logSecurity({
        event: 'adms_attlog_rejected',
        message,
        ipAddress,
        method,
        path,
        serialNumber: existingDevice.serialNumber,
      });

      return {
        body: 'OK',
        device: existingDevice,
        processedOk: false,
        parseError: message,
      };
    }

    const device = await this.devices.upsert(serialNumber, ipAddress);
    const lines = body.trim().split('\n').filter(Boolean);
    const records: Parameters<AttendanceService['saveRecords']>[0] = [];

    for (const line of lines) {
      const parts = line.trim().split('\t');
      if (parts.length < 4) continue;

      try {
        const [userId, rawTimestamp, rawStatus, rawVerify, workCode] = parts;
        const trimmedStatus = rawStatus.trim();
        // El reloj manda hora local Argentina (UTC-3) sin offset. Se agrega
        // explícitamente para que Date lo interprete como hora Argentina y lo
        // almacene en UTC correctamente.
        const timestamp = new Date(rawTimestamp.trim().replace(' ', 'T') + '-03:00');
        if (isNaN(timestamp.getTime())) continue;

        records.push({
          deviceSn: serialNumber,
          deviceId: device.id,
          companyId: device.companyId ?? null,
          userId: userId.trim(),
          timestamp,
          status: normalizeDevicePunchState(trimmedStatus),
          devicePunchStateRaw: trimmedStatus || null,
          devicePunchStateLabel: devicePunchStateLabel(trimmedStatus),
          verifyType: parseInt(rawVerify, 10),
          workCode: workCode?.trim() || null,
          rawPayload: line,
        });
      } catch {
        this.logger.warn(`Línea ATTLOG inválida: ${line}`);
      }
    }

    if (records.length > 0) {
      await this.attendance.saveRecords(records);
      this.logger.log(`${records.length} registros guardados del dispositivo ${serialNumber}`);
      const deviceOvertimeStateCount = records.filter((record) =>
        isDeviceOvertimeState(record.devicePunchStateRaw),
      ).length;
      if (deviceOvertimeStateCount > 0) {
        this.logger.log(
          `ATTLOG ${serialNumber}: ${deviceOvertimeStateCount} fichada(s) llegaron con estado extra/OT del reloj; se guardan solo como auditoría.`,
        );
      }
    }

    await this.devices.markAttendanceSyncFromPush(serialNumber, records.length, body);

    return {
      body: 'OK',
      device,
      processedOk: true,
    };
  }

  async handleHeartbeat(serialNumber: string, ipAddress: string): Promise<AdmsProcessResult> {
    const result = await this.devices.getNextCommandForHeartbeat(serialNumber, ipAddress);
    return {
      body: result.command,
      device: result.device,
      processedOk: true,
    };
  }

  async handlePing(serialNumber: string | undefined, ipAddress: string): Promise<AdmsProcessResult> {
    const device = serialNumber?.trim()
      ? await this.devices.upsert(serialNumber, ipAddress)
      : null;

    return {
      body: 'OK',
      device,
      processedOk: true,
    };
  }

  async handleCommandResult(
    serialNumber: string | undefined,
    rawPayload: string,
    query: Record<string, unknown>,
    ipAddress: string | undefined,
  ): Promise<AdmsProcessResult> {
    let device = await this.devices.findBySerialNumber(serialNumber);
    if (!device && serialNumber?.trim()) {
      device = await this.devices.upsert(serialNumber, ipAddress || '');
    }

    await this.devices.markCommandResult(serialNumber, rawPayload, query);

    return {
      body: 'OK',
      device,
      processedOk: true,
    };
  }

  async findDeviceBySerialNumber(serialNumber?: string | null): Promise<Device | null> {
    return this.devices.findBySerialNumber(serialNumber ?? undefined);
  }

  private normalizeSerialNumber(serialNumber?: string | null): string | null {
    if (typeof serialNumber !== 'string') {
      return null;
    }

    const normalized = serialNumber.trim();
    return normalized || null;
  }
}

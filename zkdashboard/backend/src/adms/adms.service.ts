import { Injectable, Logger } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { DevicesService } from '../devices/devices.service';
import { logAttendance } from '../logging/file-log.util';

@Injectable()
export class AdmsService {
  private readonly logger = new Logger(AdmsService.name);

  constructor(
    private readonly attendance: AttendanceService,
    private readonly devices: DevicesService,
  ) {}

  async handleInit(serialNumber: string, ipAddress: string): Promise<string> {
    await this.devices.upsert(serialNumber, ipAddress);
    this.logger.log(`Dispositivo conectado: ${serialNumber} (${ipAddress})`);

    // Respuesta requerida por el protocolo ADMS
    return [
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
    ].join('\n');
  }

  async handlePush(
    serialNumber: string,
    table: string,
    body: string,
    ipAddress: string,
    method: string,
    path: string,
  ): Promise<string> {
    logAttendance({
      ipAddress,
      serialNumber,
      table,
      method,
      path,
      body,
    });

    if (table !== 'ATTLOG') return 'OK';

    const lines = body.trim().split('\n').filter(Boolean);
    const records = [];

    for (const line of lines) {
      const parts = line.trim().split('\t');
      if (parts.length < 4) continue;

      try {
        const [userId, rawTimestamp, rawStatus, rawVerify, workCode] = parts;
        const timestamp = new Date(rawTimestamp.replace(' ', 'T'));
        if (isNaN(timestamp.getTime())) continue;

        records.push({
          deviceSn: serialNumber,
          userId: userId.trim(),
          timestamp,
          status: parseInt(rawStatus, 10),
          verifyType: parseInt(rawVerify, 10),
          workCode: workCode?.trim() || null,
        });
      } catch {
        this.logger.warn(`Línea ATTLOG inválida: ${line}`);
      }
    }

    if (records.length > 0) {
      await this.attendance.saveRecords(records);
      this.logger.log(`${records.length} registros guardados del dispositivo ${serialNumber}`);
    }

    return 'OK';
  }

  async handleHeartbeat(serialNumber: string, ipAddress: string): Promise<string> {
    await this.devices.upsert(serialNumber, ipAddress);
    return 'OK';
  }
}

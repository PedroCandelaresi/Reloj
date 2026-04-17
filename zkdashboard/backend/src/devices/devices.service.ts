import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity';
import {
  DEVICE_COMMAND_STATUSES,
  DEVICE_COMMAND_TYPES,
  DeviceCommand,
} from './device-command.entity';

const FORCE_SYNC_COMMAND = 'DATA QUERY ATTLOG';
const FORCE_SYNC_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const ACTIVE_SENT_REPLACEMENT_REASON =
  'Sin confirmación del dispositivo. Reemplazado por una nueva solicitud manual.';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly repo: Repository<Device>,
    @InjectRepository(DeviceCommand)
    private readonly commandsRepo: Repository<DeviceCommand>,
  ) {}

  async upsert(serialNumber: string, ipAddress: string): Promise<Device> {
    const existing = await this.repo.findOneBy({ serialNumber });
    if (existing) {
      await this.repo.update(existing.id, { ipAddress });
      return this.repo.findOneByOrFail({ id: existing.id });
    } else {
      return this.repo.save({
        serialNumber,
        ipAddress,
        isActive: true,
      });
    }
  }

  findAll(): Promise<Device[]> {
    return this.repo.find({ order: { lastSeen: 'DESC' } });
  }

  async enqueueAttendanceSync(deviceId: number, requestedBy?: string) {
    const device = await this.repo.findOneBy({ id: deviceId });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }
    if (!device.isActive) {
      throw new ConflictException('El dispositivo está inactivo.');
    }

    const existing = await this.findActiveAttendanceSync(device.id);
    if (existing) {
      return { device, command: existing, duplicate: true as const };
    }

    await this.cancelStaleAttendanceSyncs(device.id);

    const command = await this.commandsRepo.save(
      this.commandsRepo.create({
        deviceId: device.id,
        commandType: DEVICE_COMMAND_TYPES.ATTENDANCE_SYNC,
        command: FORCE_SYNC_COMMAND,
        status: DEVICE_COMMAND_STATUSES.PENDING,
        requestedBy: requestedBy?.trim() || null,
      }),
    );

    this.logger.log(
      `Sincronización manual encolada para ${device.serialNumber} por ${requestedBy || 'usuario desconocido'}`,
    );

    return { device, command, duplicate: false as const };
  }

  async getNextCommandForHeartbeat(
    serialNumber: string,
    ipAddress: string,
  ): Promise<string> {
    const device = await this.upsert(serialNumber, ipAddress);

    if (!device.isActive) {
      return 'OK';
    }

    const pendingCommand = await this.commandsRepo.findOne({
      where: {
        deviceId: device.id,
        status: DEVICE_COMMAND_STATUSES.PENDING,
      },
      order: {
        requestedAt: 'ASC',
      },
    });

    if (!pendingCommand) {
      return 'OK';
    }

    pendingCommand.status = DEVICE_COMMAND_STATUSES.SENT;
    pendingCommand.sentAt = new Date();
    pendingCommand.error = null;
    await this.commandsRepo.save(pendingCommand);

    this.logger.log(
      `Comando ${pendingCommand.id} enviado al dispositivo ${serialNumber}: ${pendingCommand.command}`,
    );

    return `C:${pendingCommand.id}:${pendingCommand.command}`;
  }

  async markAttendanceSyncFromPush(
    serialNumber: string,
    recordCount: number,
    rawPayload: string,
  ): Promise<void> {
    const command = await this.findLatestSentCommandForSerialNumber(serialNumber);
    if (!command || command.commandType !== DEVICE_COMMAND_TYPES.ATTENDANCE_SYNC) {
      return;
    }

    command.status = DEVICE_COMMAND_STATUSES.ACKNOWLEDGED;
    command.acknowledgedAt = new Date();
    command.error = null;
    command.responsePayload = this.buildPushSummary(recordCount, rawPayload);
    await this.commandsRepo.save(command);

    this.logger.log(
      `Comando ${command.id} confirmado por recepción ATTLOG del dispositivo ${serialNumber}`,
    );
  }

  async markCommandResult(
    serialNumber: string | undefined,
    rawPayload: string,
    query: Record<string, unknown>,
  ): Promise<void> {
    const payload = this.parseDevicePayload(rawPayload, query);
    const commandId = this.parseNumericValue(payload.ID ?? payload.CMDID ?? payload.CID);
    const resolvedSerialNumber =
      serialNumber?.trim() ||
      payload.SN ||
      payload.SERIALNUMBER ||
      payload.DEVICEID ||
      undefined;

    const command = commandId
      ? await this.commandsRepo.findOneBy({ id: commandId })
      : resolvedSerialNumber
        ? await this.findLatestSentCommandForSerialNumber(resolvedSerialNumber)
        : null;

    if (!command) {
      this.logger.warn(
        `Respuesta devicecmd sin comando asociado. sn=${resolvedSerialNumber || '-'} payload="${rawPayload.trim() || '(vacío)'}"`,
      );
      return;
    }

    if (
      command.status === DEVICE_COMMAND_STATUSES.ACKNOWLEDGED ||
      command.status === DEVICE_COMMAND_STATUSES.CANCELLED ||
      command.status === DEVICE_COMMAND_STATUSES.FAILED
    ) {
      return;
    }

    const resultCode =
      payload.RETURN ||
      payload.RET ||
      payload.RESULT ||
      payload.STATUS ||
      '';
    const isSuccess = this.isSuccessfulResult(resultCode);

    command.status = isSuccess
      ? DEVICE_COMMAND_STATUSES.ACKNOWLEDGED
      : DEVICE_COMMAND_STATUSES.FAILED;
    command.acknowledgedAt = new Date();
    command.responsePayload = rawPayload.trim() || JSON.stringify(payload);
    command.error = isSuccess
      ? null
      : `El dispositivo devolvió un estado no exitoso (${resultCode || 'desconocido'}).`;

    await this.commandsRepo.save(command);

    this.logger.log(
      `Resultado devicecmd para comando ${command.id}: ${command.status}`,
    );
  }

  private async findActiveAttendanceSync(
    deviceId: number,
  ): Promise<DeviceCommand | null> {
    const pending = await this.commandsRepo.findOne({
      where: {
        deviceId,
        commandType: DEVICE_COMMAND_TYPES.ATTENDANCE_SYNC,
        status: DEVICE_COMMAND_STATUSES.PENDING,
      },
      order: {
        requestedAt: 'ASC',
      },
    });

    if (pending) {
      return pending;
    }

    const duplicateSince = new Date(Date.now() - FORCE_SYNC_DUPLICATE_WINDOW_MS);
    return this.commandsRepo
      .createQueryBuilder('command')
      .where('command.device_id = :deviceId', { deviceId })
      .andWhere('command.command_type = :commandType', {
        commandType: DEVICE_COMMAND_TYPES.ATTENDANCE_SYNC,
      })
      .andWhere('command.status = :status', {
        status: DEVICE_COMMAND_STATUSES.SENT,
      })
      .andWhere('COALESCE(command.sent_at, command.requested_at) >= :duplicateSince', {
        duplicateSince,
      })
      .orderBy('COALESCE(command.sent_at, command.requested_at)', 'DESC')
      .getOne();
  }

  private async cancelStaleAttendanceSyncs(deviceId: number): Promise<void> {
    const duplicateSince = new Date(Date.now() - FORCE_SYNC_DUPLICATE_WINDOW_MS);

    await this.commandsRepo
      .createQueryBuilder()
      .update(DeviceCommand)
      .set({
        status: DEVICE_COMMAND_STATUSES.CANCELLED,
        error: ACTIVE_SENT_REPLACEMENT_REASON,
      })
      .where('device_id = :deviceId', { deviceId })
      .andWhere('command_type = :commandType', {
        commandType: DEVICE_COMMAND_TYPES.ATTENDANCE_SYNC,
      })
      .andWhere('status = :status', { status: DEVICE_COMMAND_STATUSES.SENT })
      .andWhere('COALESCE(sent_at, requested_at) < :duplicateSince', {
        duplicateSince,
      })
      .execute();
  }

  private async findLatestSentCommandForSerialNumber(
    serialNumber: string,
  ): Promise<DeviceCommand | null> {
    return this.commandsRepo
      .createQueryBuilder('command')
      .innerJoin('command.device', 'device')
      .where('device.serial_number = :serialNumber', { serialNumber })
      .andWhere('command.status = :status', {
        status: DEVICE_COMMAND_STATUSES.SENT,
      })
      .orderBy('command.sent_at', 'DESC')
      .addOrderBy('command.requested_at', 'DESC')
      .getOne();
  }

  private parseDevicePayload(
    rawPayload: string,
    query: Record<string, unknown>,
  ): Record<string, string> {
    const values: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      const normalized = this.normalizeUnknownValue(value);
      if (normalized) {
        values[key.trim().toUpperCase()] = normalized;
      }
    }

    const trimmed = rawPayload.trim();
    if (!trimmed) {
      return values;
    }

    if (trimmed.includes('=')) {
      for (const [key, value] of new URLSearchParams(trimmed.replace(/\r?\n/g, '&'))) {
        if (key.trim()) {
          values[key.trim().toUpperCase()] = value.trim();
        }
      }

      for (const line of trimmed.split(/\r?\n/)) {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex <= 0) {
          continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (key) {
          values[key.toUpperCase()] = value;
        }
      }
    }

    return values;
  }

  private normalizeUnknownValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || undefined;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          return item.trim();
        }
      }
    }

    return undefined;
  }

  private parseNumericValue(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isSuccessfulResult(resultCode: string): boolean {
    if (!resultCode) {
      return true;
    }

    const normalized = resultCode.trim().toUpperCase();
    return normalized === '0' || normalized === 'OK' || normalized === 'SUCCESS';
  }

  private buildPushSummary(recordCount: number, rawPayload: string): string {
    const preview = rawPayload
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 3)
      .join('\n');

    if (!preview) {
      return `ATTLOG recibido sin líneas de marcación. registros=${recordCount}`;
    }

    return `ATTLOG recibido. registros=${recordCount}\n${preview}`;
  }
}

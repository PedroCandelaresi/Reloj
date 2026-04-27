import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { Company } from '../companies/company.entity';
import { Device } from './device.entity';
import {
  DEVICE_COMMAND_STATUSES,
  DEVICE_COMMAND_TYPES,
  DeviceCommand,
} from './device-command.entity';

const FORCE_SYNC_COMMAND = 'DATA QUERY ATTLOG';
const FORCE_SYNC_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_ONLINE_THRESHOLD_MS = 300_000;
const ACTIVE_SENT_REPLACEMENT_REASON =
  'Sin confirmación del dispositivo. Reemplazado por una nueva solicitud manual.';

export interface AdminDeviceView {
  id: number;
  serialNumber: string;
  ipAddress: string | null;
  isActive: boolean;
  alias: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  assignedAt: Date | null;
  firstSeen: Date;
  lastSeen: Date;
  company: {
    id: string;
    cuit: string;
    razonSocial: string;
    nombreFantasia: string | null;
    isActive: boolean;
  } | null;
}

export interface DeviceOperationalView extends AdminDeviceView {
  name: string;
  online: boolean;
  status: 'online' | 'offline';
  lastSyncAt: Date | null;
  pendingCommandsCount: number;
}

export interface DeviceDashboardMetrics {
  onlineCount: number;
  offlineCount: number;
  lastSyncAt: Date | null;
  technicalNews: string[];
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly repo: Repository<Device>,
    @InjectRepository(DeviceCommand)
    private readonly commandsRepo: Repository<DeviceCommand>,
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
  ) {}

  async upsert(serialNumber: string, ipAddress: string): Promise<Device> {
    const normalizedSerialNumber = this.normalizeSerialNumber(serialNumber);
    if (!normalizedSerialNumber) {
      throw new BadRequestException('El request ADMS no incluye un serial number válido.');
    }

    const normalizedIpAddress = this.normalizeNullable(ipAddress);
    const existing = await this.repo.findOne({
      where: { serialNumber: normalizedSerialNumber },
      relations: {
        company: true,
      },
    });

    if (existing) {
      existing.ipAddress = normalizedIpAddress ?? existing.ipAddress;
      existing.lastSeen = new Date();
      return this.repo.save(existing);
    } else {
      return this.repo.save({
        serialNumber: normalizedSerialNumber,
        ipAddress: normalizedIpAddress ?? null,
        isActive: true,
        companyId: null,
        alias: null,
        assignedAt: null,
      });
    }
  }

  findAll(): Promise<Device[]> {
    return this.repo.find({ order: { lastSeen: 'DESC' } });
  }

  async findAllForUser(user: AuthenticatedUser): Promise<DeviceOperationalView[]> {
    const companyId = getCompanyScope(user);

    const devices = await this.repo.find({
      where: companyId ? { companyId } : {},
      relations: {
        company: true,
      },
      order: {
        lastSeen: 'DESC',
        serialNumber: 'ASC',
      },
    });

    return Promise.all(devices.map((device) => this.serializeOperationalDevice(device)));
  }

  async findAllForAdmin(): Promise<DeviceOperationalView[]> {
    const devices = await this.repo.find({
      relations: {
        company: true,
      },
      order: {
        lastSeen: 'DESC',
        serialNumber: 'ASC',
      },
    });

    return Promise.all(devices.map((device) => this.serializeOperationalDevice(device)));
  }

  async findUnassignedForAdmin(): Promise<DeviceOperationalView[]> {
    const devices = await this.repo.find({
      where: {
        companyId: null,
      },
      relations: {
        company: true,
      },
      order: {
        lastSeen: 'DESC',
        serialNumber: 'ASC',
      },
    });

    return Promise.all(devices.map((device) => this.serializeOperationalDevice(device)));
  }

  async findOneForAdmin(id: number): Promise<DeviceOperationalView> {
    const device = await this.repo.findOne({
      where: { id },
      relations: {
        company: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }

    return this.serializeOperationalDevice(device);
  }

  async getDashboardMetrics(user: AuthenticatedUser): Promise<DeviceDashboardMetrics> {
    const devices = await this.findAllForUser(user);
    const onlineCount = devices.filter((device) => device.online).length;
    const offlineDevices = devices.filter((device) => !device.online);
    const lastSyncAt = devices.reduce<Date | null>((latest, device) => {
      if (!device.lastSyncAt) {
        return latest;
      }

      if (!latest || new Date(device.lastSyncAt).getTime() > latest.getTime()) {
        return new Date(device.lastSyncAt);
      }

      return latest;
    }, null);
    const pendingTotal = devices.reduce(
      (total, device) => total + device.pendingCommandsCount,
      0,
    );
    const technicalNews: string[] = [];

    if (offlineDevices.length > 0) {
      technicalNews.push(`${offlineDevices.length} dispositivo(s) sin heartbeat reciente.`);
    }

    if (pendingTotal > 0) {
      technicalNews.push(`${pendingTotal} comando(s) pendientes de retirar por relojes.`);
    }

    const failedCommands = await this.countRecentFailedCommands(user);
    if (failedCommands > 0) {
      technicalNews.push(`${failedCommands} comando(s) fallidos en las últimas 24 horas.`);
    }

    if (technicalNews.length === 0) {
      technicalNews.push('Sin novedades técnicas relevantes.');
    }

    return {
      onlineCount,
      offlineCount: offlineDevices.length,
      lastSyncAt,
      technicalNews,
    };
  }

  async enqueueAttendanceSync(
    deviceId: number,
    requestedBy?: string,
    user?: AuthenticatedUser,
  ) {
    const device = await this.findDeviceForOperation(deviceId, user);
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
        companyId: device.companyId ?? null,
        status: DEVICE_COMMAND_STATUSES.PENDING,
        requestedBy: requestedBy?.trim() || null,
      }),
    );

    this.logger.log(
      `Sincronización manual encolada para ${device.serialNumber} por ${requestedBy || 'usuario desconocido'}`,
    );

    return { device, command, duplicate: false as const };
  }

  async assignCompany(
    deviceId: number,
    companyId: string,
    alias?: string | null,
    address?: string | null,
    email?: string | null,
    phone?: string | null,
  ) {
    const device = await this.repo.findOne({
      where: { id: deviceId },
      relations: { company: true },
    });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }

    const company = await this.companiesRepo.findOneBy({ id: companyId });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    if (!company.isActive) {
      throw new ConflictException('La empresa seleccionada está inactiva.');
    }

    device.companyId = company.id;
    device.company = company;
    device.assignedAt = new Date();

    const normalizedAlias = this.normalizeNullable(alias);
    if (normalizedAlias !== undefined) device.alias = normalizedAlias;

    const normalizedAddress = this.normalizeNullable(address);
    if (normalizedAddress !== undefined) device.address = normalizedAddress;

    const normalizedEmail = this.normalizeNullable(email);
    if (normalizedEmail !== undefined) device.email = normalizedEmail;

    const normalizedPhone = this.normalizeNullable(phone);
    if (normalizedPhone !== undefined) device.phone = normalizedPhone;

    const saved = await this.repo.save(device);
    return this.serializeOperationalDevice({ ...saved, company });
  }

  async unassignCompany(deviceId: number) {
    const device = await this.repo.findOne({
      where: { id: deviceId },
      relations: {
        company: true,
      },
    });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }

    device.companyId = null;
    device.company = null;
    device.assignedAt = null;

    const saved = await this.repo.save(device);
    return this.serializeOperationalDevice(saved);
  }

  async getNextCommandForHeartbeat(
    serialNumber: string,
    ipAddress: string,
  ): Promise<{ command: string; device: Device }> {
    const device = await this.upsert(serialNumber, ipAddress);

    if (!device.isActive) {
      return { command: 'OK', device };
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
      return { command: 'OK', device };
    }

    pendingCommand.status = DEVICE_COMMAND_STATUSES.SENT;
    pendingCommand.sentAt = new Date();
    pendingCommand.error = null;
    await this.commandsRepo.save(pendingCommand);

    this.logger.log(
      `Comando ${pendingCommand.id} enviado al dispositivo ${serialNumber}: ${pendingCommand.command}`,
    );

    return { command: `C:${pendingCommand.id}:${pendingCommand.command}`, device };
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

  async findBySerialNumber(serialNumber: string | undefined): Promise<Device | null> {
    const normalizedSerialNumber = this.normalizeSerialNumber(serialNumber);
    if (!normalizedSerialNumber) {
      return null;
    }

    return this.repo.findOne({
      where: { serialNumber: normalizedSerialNumber },
      relations: {
        company: true,
      },
    });
  }

  private serializeDevice(device: Device): AdminDeviceView {
    return {
      id: device.id,
      serialNumber: device.serialNumber,
      ipAddress: device.ipAddress,
      isActive: device.isActive,
      alias: device.alias,
      address: device.address ?? null,
      email: device.email ?? null,
      phone: device.phone ?? null,
      companyId: device.companyId,
      assignedAt: device.assignedAt,
      firstSeen: device.firstSeen,
      lastSeen: device.lastSeen,
      company: device.company
        ? {
            id: device.company.id,
            cuit: device.company.cuit,
            razonSocial: device.company.razonSocial,
            nombreFantasia: device.company.nombreFantasia,
            isActive: device.company.isActive,
          }
        : null,
    };
  }

  private async serializeOperationalDevice(device: Device): Promise<DeviceOperationalView> {
    const [lastSync, pendingCommandsCount] = await Promise.all([
      this.findLatestAttendanceSync(device.id),
      this.countPendingCommands(device.id),
    ]);
    const base = this.serializeDevice(device);
    const online = this.isOnline(device.lastSeen);

    return {
      ...base,
      name: device.alias || device.serialNumber,
      online,
      status: online ? 'online' : 'offline',
      lastSyncAt: lastSync?.acknowledgedAt ?? null,
      pendingCommandsCount,
    };
  }

  private isOnline(lastSeen?: Date | null): boolean {
    if (!lastSeen) {
      return false;
    }

    const rawThreshold = Number.parseInt(process.env.DEVICE_ONLINE_THRESHOLD_MS || '', 10);
    const thresholdMs =
      Number.isFinite(rawThreshold) && rawThreshold > 0
        ? rawThreshold
        : DEFAULT_ONLINE_THRESHOLD_MS;

    return Date.now() - new Date(lastSeen).getTime() <= thresholdMs;
  }

  private normalizeSerialNumber(value: string | undefined | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized || null;
  }

  private normalizeNullable(value: string | undefined | null): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized || null;
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

  private countPendingCommands(deviceId: number): Promise<number> {
    return this.commandsRepo.count({
      where: {
        deviceId,
        status: DEVICE_COMMAND_STATUSES.PENDING,
      },
    });
  }

  private findLatestAttendanceSync(deviceId: number): Promise<DeviceCommand | null> {
    return this.commandsRepo.findOne({
      where: {
        deviceId,
        commandType: DEVICE_COMMAND_TYPES.ATTENDANCE_SYNC,
        status: DEVICE_COMMAND_STATUSES.ACKNOWLEDGED,
      },
      order: {
        acknowledgedAt: 'DESC',
        requestedAt: 'DESC',
      },
    });
  }

  private async countRecentFailedCommands(user: AuthenticatedUser): Promise<number> {
    const companyId = getCompanyScope(user);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const qb = this.commandsRepo
      .createQueryBuilder('command')
      .where('command.status = :status', { status: DEVICE_COMMAND_STATUSES.FAILED })
      .andWhere('command.acknowledged_at >= :since', { since });

    if (companyId) {
      qb.andWhere('command.company_id = :companyId', { companyId });
    }

    return qb.getCount();
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

  private findDeviceForOperation(
    deviceId: number,
    user?: AuthenticatedUser,
  ): Promise<Device | null> {
    if (!user || user.isSuperAdmin) {
      return this.repo.findOneBy({ id: deviceId });
    }

    return this.repo.findOneBy({
      id: deviceId,
      companyId: getCompanyScope(user),
    });
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { CompanyRole } from '../companies/company-role.enum';
import { Company } from '../companies/company.entity';
import { Employee } from '../employees/employee.entity';
import { getEmployeeDeviceName, getEmployeeDisplayName } from '../employees/employee-name.util';
import {
  isSensitiveAdmsTable,
  logSecurity,
  redactSensitiveAdmsPayload,
} from '../logging/file-log.util';
import { Device } from './device.entity';
import {
  DEVICE_COMMAND_STATUSES,
  DEVICE_COMMAND_TYPES,
  DeviceCommand,
  DeviceCommandType,
} from './device-command.entity';
import {
  DEVICE_USER_MATCH_STATUSES,
  DeviceUserMatchStatus,
  DeviceUserSnapshot,
} from './device-user-snapshot.entity';

const FORCE_SYNC_COMMAND = 'DATA QUERY ATTLOG';
const FORCE_SYNC_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_ONLINE_THRESHOLD_MS = 300_000;
const DEFAULT_IDLE_THRESHOLD_MS = 30 * 60 * 1000;
const ACTIVE_COMMUNICATION_WINDOW_MS = 2 * 60 * 1000;
const SENT_RETRY_AFTER_MS = 2 * 60 * 1000;
const ACTIVE_SENT_REPLACEMENT_REASON =
  'Sin confirmación del dispositivo. Reemplazado por una nueva solicitud manual.';

export type DeviceComputedStateName =
  | 'disabled'
  | 'never_seen'
  | 'online'
  | 'idle'
  | 'offline'
  | 'communicating'
  | 'pending_commands'
  | 'error';

export interface DeviceComputedState {
  state: DeviceComputedStateName;
  label: string;
  severity: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  lastSeen: Date | null;
  minutesSinceLastSeen: number | null;
  pendingCommandsCount: number;
  failedCommandsCount: number;
  lastCommandStatus: string | null;
}

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
  isOnline: boolean;
  status: DeviceComputedStateName;
  computedState: DeviceComputedState;
  lastSyncAt: Date | null;
  pendingCommandsCount: number;
  failedCommandsCount: number;
  lastCommandStatus: string | null;
  minutesSinceLastSeen: number | null;
  companyName: string | null;
}

export interface DeviceDashboardMetrics {
  onlineCount: number;
  offlineCount: number;
  lastSyncAt: Date | null;
  technicalNews: string[];
}

export interface DeviceEmployeeSyncRecord {
  id: string;
  nombre: string;
  apellido: string;
  companyId?: string | null;
}

export interface DeviceUserReconciliationRow {
  pin: string;
  deviceUser: {
    id: string;
    pin: string;
    name: string | null;
    privilege: string | null;
    card: string | null;
    passwordPresent: boolean | null;
    lastSeenAt: Date;
  } | null;
  employee: DeviceEmployeeSyncRecord | null;
  employeeName: string | null;
  systemEmployeeName: string | null;
  deviceEmployeeName: string | null;
  status: DeviceUserMatchStatus;
}

export interface DeviceUserReconciliationView {
  device: DeviceOperationalView;
  lastUserInfoSync: Date | null;
  matched: DeviceUserReconciliationRow[];
  deviceOnly: DeviceUserReconciliationRow[];
  systemOnly: DeviceUserReconciliationRow[];
  nameMismatches: DeviceUserReconciliationRow[];
  pinConflicts: DeviceUserReconciliationRow[];
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly repo: Repository<Device>,
    @InjectRepository(DeviceCommand)
    private readonly commandsRepo: Repository<DeviceCommand>,
    @InjectRepository(DeviceUserSnapshot)
    private readonly userSnapshotsRepo: Repository<DeviceUserSnapshot>,
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
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
        createdByUserId: user?.id ?? null,
        attempts: 0,
        maxAttempts: 5,
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

  async enqueueCommand(
    deviceId: number,
    commandType: string,
    requestedBy?: string,
    user?: AuthenticatedUser,
    payload?: Record<string, unknown> | null,
  ) {
    this.assertCanSendCommand(commandType, user);
    const device = await this.findDeviceForOperation(deviceId, user);
    if (!device) throw new NotFoundException('Dispositivo no encontrado.');
    if (!device.isActive) throw new ConflictException('El dispositivo está inactivo.');

    let commandStr: string;
    if (commandType === DEVICE_COMMAND_TYPES.ATTENDANCE_SYNC) {
      return this.enqueueAttendanceSync(deviceId, requestedBy, user);
    } else if (commandType === DEVICE_COMMAND_TYPES.SET_TIME) {
      commandStr = `SET OPTIONS DateTime=${this.formatArgentinaDateTime(new Date())}`;
    } else if (commandType === DEVICE_COMMAND_TYPES.REBOOT) {
      commandStr = 'REBOOT';
    } else if (commandType === DEVICE_COMMAND_TYPES.CHECK) {
      commandStr = 'CHECK TIME';
    } else if (commandType === DEVICE_COMMAND_TYPES.QUERY_ATTLOG) {
      commandStr = this.buildQueryAttlogCommand(payload);
    } else if (commandType === DEVICE_COMMAND_TYPES.CLEAR_ATTLOG) {
      commandStr = 'DATA CLEAR ATTLOG';
    } else {
      throw new ConflictException(`Tipo de comando desconocido: ${commandType}`);
    }

    const command = await this.commandsRepo.save(
      this.commandsRepo.create({
        deviceId: device.id,
        commandType: commandType as DeviceCommandType,
        command: commandStr,
        companyId: device.companyId,
        status: DEVICE_COMMAND_STATUSES.PENDING,
        requestedBy: requestedBy ?? null,
        createdByUserId: user?.id ?? null,
        payload: payload ?? null,
        attempts: 0,
        maxAttempts: 5,
      }),
    );

    this.logger.log(`Comando encolado para dispositivo ${device.serialNumber}: ${commandStr}`);
    return { command, device };
  }

  async enqueueEmployeeImportCommands(
    deviceId: number,
    requestedBy: string | undefined,
    user: AuthenticatedUser,
  ): Promise<{ device: Device; commands: DeviceCommand[] }> {
    this.assertCanSendCommand(DEVICE_COMMAND_TYPES.QUERY_USERINFO, user);
    const device = await this.findDeviceForOperation(deviceId, user);
    if (!device) throw new NotFoundException('Dispositivo no encontrado.');
    if (!device.isActive) throw new ConflictException('El dispositivo está inactivo.');
    if (!device.companyId) {
      throw new BadRequestException('El reloj debe estar asignado a una empresa.');
    }

    const commandSpecs: Array<{ type: DeviceCommandType; command: string; payload: Record<string, unknown> }> = [
      {
        type: DEVICE_COMMAND_TYPES.QUERY_USERINFO,
        command: 'DATA QUERY USERINFO',
        payload: { importsEmployees: true },
      },
    ];

    const commands = await this.commandsRepo.save(
      commandSpecs.map((spec) =>
        this.commandsRepo.create({
          deviceId: device.id,
          commandType: spec.type,
          command: spec.command,
          companyId: device.companyId,
          status: DEVICE_COMMAND_STATUSES.PENDING,
          requestedBy: requestedBy ?? null,
          createdByUserId: user.id,
          payload: spec.payload,
          attempts: 0,
          maxAttempts: 5,
        }),
      ),
    );

    return { device, commands };
  }

  async enqueueEmployeeExportCommands(
    deviceId: number,
    employees: DeviceEmployeeSyncRecord[],
    requestedBy: string | undefined,
    user: AuthenticatedUser,
  ): Promise<{ device: Device; commands: DeviceCommand[] }> {
    this.assertCanSendCommand(DEVICE_COMMAND_TYPES.UPDATE_USERINFO, user);
    const device = await this.findDeviceForOperation(deviceId, user);
    if (!device) throw new NotFoundException('Dispositivo no encontrado.');
    if (!device.isActive) throw new ConflictException('El dispositivo está inactivo.');
    if (!device.companyId) {
      throw new BadRequestException('El reloj debe estar asignado a una empresa.');
    }
    if (employees.some((employee) => employee.companyId !== device.companyId)) {
      throw new ForbiddenException('El empleado no pertenece a la empresa del reloj.');
    }
    if (employees.length === 0) {
      throw new ConflictException('No hay empleados para enviar al reloj.');
    }

    const commands = await this.commandsRepo.save(
      employees.map((employee) =>
        this.commandsRepo.create({
          deviceId: device.id,
          commandType: DEVICE_COMMAND_TYPES.UPDATE_USERINFO,
          command: this.buildUpdateUserInfoCommand(employee),
          companyId: device.companyId,
          status: DEVICE_COMMAND_STATUSES.PENDING,
          requestedBy: requestedBy ?? null,
          createdByUserId: user.id,
          payload: {
            employeeId: employee.id,
            nombre: employee.nombre,
            apellido: employee.apellido,
            displayName: getEmployeeDisplayName(employee),
            deviceName: getEmployeeDeviceName(employee),
          },
          attempts: 0,
          maxAttempts: 5,
        }),
      ),
    );

    return { device, commands };
  }

  async findCommandsForDevice(
    deviceId: number,
    user: AuthenticatedUser,
  ): Promise<DeviceCommand[]> {
    const device = await this.findDeviceForOperation(deviceId, user);
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }

    return this.commandsRepo.find({
      where: { deviceId: device.id },
      order: {
        requestedAt: 'DESC',
        id: 'DESC',
      },
      take: 100,
    });
  }

  async retryCommand(
    deviceId: number,
    commandId: number,
    user: AuthenticatedUser,
  ): Promise<{ command: DeviceCommand; device: Device }> {
    this.assertCanSendCommand('retry', user);
    const device = await this.findDeviceForOperation(deviceId, user);
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }

    const command = await this.commandsRepo.findOneBy({
      id: commandId,
      deviceId: device.id,
    });

    if (!command) {
      throw new NotFoundException('Comando no encontrado.');
    }

    if (
      command.status !== DEVICE_COMMAND_STATUSES.FAILED &&
      command.status !== DEVICE_COMMAND_STATUSES.EXPIRED
    ) {
      throw new ConflictException('Solo se pueden reintentar comandos fallidos o expirados.');
    }

    if (command.attempts >= command.maxAttempts) {
      command.maxAttempts = command.attempts + 1;
    }

    command.status = DEVICE_COMMAND_STATUSES.PENDING;
    command.error = null;
    command.errorMessage = null;
    command.failedAt = null;
    await this.commandsRepo.save(command);

    return { command, device };
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

    if (pendingCommand.attempts >= pendingCommand.maxAttempts) {
      pendingCommand.status = DEVICE_COMMAND_STATUSES.EXPIRED;
      pendingCommand.failedAt = new Date();
      pendingCommand.error = 'El comando expiró por superar la cantidad máxima de intentos.';
      pendingCommand.errorMessage = pendingCommand.error;
      await this.commandsRepo.save(pendingCommand);
      return { command: 'OK', device };
    }

    pendingCommand.status = DEVICE_COMMAND_STATUSES.SENT;
    pendingCommand.attempts += 1;
    pendingCommand.sentAt = new Date();
    pendingCommand.lastAttemptAt = pendingCommand.sentAt;
    pendingCommand.error = null;
    pendingCommand.errorMessage = null;
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
    command.errorMessage = null;
    command.resultRaw = this.buildPushSummary(recordCount, rawPayload);
    command.responsePayload = this.buildPushSummary(recordCount, rawPayload);
    await this.commandsRepo.save(command);

    this.logger.log(
      `Comando ${command.id} confirmado por recepción ATTLOG del dispositivo ${serialNumber}`,
    );
  }

  async markDeviceDataQueryFromPush(
    serialNumber: string,
    table: string,
    rawPayload: string,
  ): Promise<void> {
    const commandType = this.getDataQueryCommandTypeForTable(table);
    if (!commandType) {
      return;
    }

    const command = await this.findLatestSentCommandForSerialNumberAndType(
      serialNumber,
      commandType,
    );
    if (!command) {
      return;
    }

    command.status = DEVICE_COMMAND_STATUSES.ACKNOWLEDGED;
    command.acknowledgedAt = new Date();
    command.error = null;
    command.errorMessage = null;
    command.resultRaw = isSensitiveAdmsTable(table)
      ? redactSensitiveAdmsPayload({
          table,
          serialNumber,
          body: rawPayload,
        })
      : rawPayload.trim() || `${table} recibido sin payload`;
    command.responsePayload = command.resultRaw;
    await this.commandsRepo.save(command);
  }

  async importUserInfoSnapshotFromPush(
    device: Device,
    rawBody: string,
  ): Promise<{ upserted: number; skipped: number }> {
    if (!device.companyId) {
      return { upserted: 0, skipped: 0 };
    }

    const rows = this.parseUserInfoRows(rawBody);
    let upserted = 0;
    let skipped = 0;
    const now = new Date();

    for (const row of rows) {
      const pin = this.getFirstValue(row, ['PIN', 'USERID', 'UID', 'ID']);
      if (!pin) {
        skipped += 1;
        continue;
      }

      const name = this.getFirstValue(row, ['NAME', 'NOMBRE', 'USERNAME']);
      const employee = await this.employeesRepo.findOneBy({ id: pin });
      const match = this.resolveSnapshotMatch(device.companyId, employee, name);
      const existing = await this.userSnapshotsRepo.findOneBy({
        deviceId: device.id,
        pin,
      });

      const snapshot = existing ?? this.userSnapshotsRepo.create({
        deviceId: device.id,
        companyId: device.companyId,
        pin,
      });

      snapshot.companyId = device.companyId;
      snapshot.deviceId = device.id;
      snapshot.pin = pin;
      snapshot.name = name;
      snapshot.privilege = this.getFirstValue(row, ['PRI', 'PRIVILEGE', 'ROLE']);
      snapshot.card = this.getFirstValue(row, ['CARD', 'CARDNO', 'CARDNUMBER']);
      snapshot.passwordPresent = this.hasPasswordValue(row);
      snapshot.rawData = this.sanitizeUserInfoRow(row);
      snapshot.lastSeenAt = now;
      snapshot.matchedEmployeeId = match.employeeId;
      snapshot.matchStatus = match.status;

      await this.userSnapshotsRepo.save(snapshot);
      upserted += 1;
    }

    return { upserted, skipped };
  }

  async getUserReconciliation(
    deviceId: number,
    user: AuthenticatedUser,
  ): Promise<DeviceUserReconciliationView> {
    const device = await this.findDeviceForOperation(deviceId, user);
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado.');
    }
    if (!device.companyId) {
      throw new BadRequestException('El reloj debe estar asignado a una empresa.');
    }

    const [snapshots, employees, latestUserInfoCommand, deviceView] = await Promise.all([
      this.userSnapshotsRepo.find({
        where: { deviceId: device.id, companyId: device.companyId },
        relations: { matchedEmployee: true },
        order: { pin: 'ASC' },
      }),
      this.employeesRepo.find({
        where: { companyId: device.companyId },
        order: { apellido: 'ASC', nombre: 'ASC', id: 'ASC' },
      }),
      this.findLatestUserInfoCommand(device.id),
      this.serializeOperationalDevice(device),
    ]);

    const rowsByStatus: Record<DeviceUserMatchStatus, DeviceUserReconciliationRow[]> = {
      matched: [],
      system_only: [],
      device_only: [],
      name_mismatch: [],
      pin_conflict: [],
    };
    const latestSnapshotSeenAt = snapshots.reduce<Date | null>((latest, snapshot) => {
      if (!latest || snapshot.lastSeenAt > latest) {
        return snapshot.lastSeenAt;
      }
      return latest;
    }, null);
    const currentSnapshots = latestSnapshotSeenAt
      ? snapshots.filter(
          (snapshot) => snapshot.lastSeenAt.getTime() === latestSnapshotSeenAt.getTime(),
        )
      : snapshots;
    const snapshotsByPin = new Map(currentSnapshots.map((snapshot) => [snapshot.pin, snapshot]));
    const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
    const employeesByPin = currentSnapshots.length > 0
      ? await this.employeesRepo.find({
          where: { id: In(currentSnapshots.map((snapshot) => snapshot.pin)) },
        })
      : [];
    const anyEmployeeById = new Map(employeesByPin.map((employee) => [employee.id, employee]));

    for (const snapshot of currentSnapshots) {
      const employee = employeesById.get(snapshot.pin) ?? null;
      const status = this.resolveReconciliationStatus(
        device.companyId,
        snapshot,
        employee ?? anyEmployeeById.get(snapshot.pin) ?? null,
      );
      const matchedEmployeeId = status === DEVICE_USER_MATCH_STATUSES.PIN_CONFLICT
        ? null
        : employee?.id ?? null;
      if (snapshot.matchStatus !== status || snapshot.matchedEmployeeId !== matchedEmployeeId) {
        snapshot.matchStatus = status;
        snapshot.matchedEmployeeId = matchedEmployeeId;
        await this.userSnapshotsRepo.save(snapshot);
      }

      rowsByStatus[status].push(this.buildReconciliationRow(snapshot.pin, snapshot, employee, status));
    }

    for (const employee of employees) {
      if (snapshotsByPin.has(employee.id)) {
        continue;
      }

      rowsByStatus.system_only.push(
        this.buildReconciliationRow(
          employee.id,
          null,
          employee,
          DEVICE_USER_MATCH_STATUSES.SYSTEM_ONLY,
        ),
      );
    }

    return {
      device: deviceView,
      lastUserInfoSync: latestUserInfoCommand?.acknowledgedAt ?? latestSnapshotSeenAt,
      matched: rowsByStatus.matched,
      deviceOnly: rowsByStatus.device_only,
      systemOnly: rowsByStatus.system_only,
      nameMismatches: rowsByStatus.name_mismatch,
      pinConflicts: rowsByStatus.pin_conflict,
    };
  }

  async enqueueUserInfoQuery(
    deviceId: number,
    user: AuthenticatedUser,
  ): Promise<{ device: Device; commands: DeviceCommand[] }> {
    return this.enqueueEmployeeImportCommands(deviceId, user.username, user);
  }

  async enqueueEmployeeUserSync(
    deviceId: number,
    employeeId: string,
    user: AuthenticatedUser,
  ): Promise<{ device: Device; command: DeviceCommand }> {
    const companyId = getCompanyScope(user);
    const employee = await this.employeesRepo.findOneBy(
      user.isSuperAdmin
        ? { id: employeeId }
        : { id: employeeId, companyId },
    );

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado.');
    }

    const result = await this.enqueueEmployeeExportCommands(
      deviceId,
      [
        {
          id: employee.id,
          nombre: employee.nombre,
          apellido: employee.apellido,
          companyId: employee.companyId,
        },
      ],
      user.username,
      user,
    );

    return { device: result.device, command: result.commands[0] };
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
      ? await this.findCommandForDeviceResult(commandId, resolvedSerialNumber)
      : resolvedSerialNumber
        ? await this.findLatestSentCommandForSerialNumber(resolvedSerialNumber)
        : null;

    if (!command) {
      this.logger.warn(
        `Respuesta devicecmd sin comando asociado. sn=${resolvedSerialNumber || '-'} commandId=${commandId || '-'}`,
      );
      return;
    }

    if (
      command.status === DEVICE_COMMAND_STATUSES.ACKNOWLEDGED ||
      command.status === DEVICE_COMMAND_STATUSES.CANCELLED ||
      command.status === DEVICE_COMMAND_STATUSES.FAILED ||
      command.status === DEVICE_COMMAND_STATUSES.EXPIRED
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
    const resultAt = new Date();
    command.acknowledgedAt = isSuccess ? resultAt : command.acknowledgedAt;
    command.failedAt = isSuccess ? null : resultAt;
    command.resultCode = resultCode || null;
    command.resultRaw = command.commandType === DEVICE_COMMAND_TYPES.QUERY_BIOMETRICS
      ? redactSensitiveAdmsPayload({
          table: command.command,
          serialNumber: resolvedSerialNumber,
          body: rawPayload,
        })
      : rawPayload.trim() || JSON.stringify(payload);
    command.responsePayload = command.resultRaw;
    command.errorMessage = isSuccess
      ? null
      : `El dispositivo devolvió un estado no exitoso (${resultCode || 'desconocido'}).`;
    command.error = command.errorMessage;

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
    const [lastSync, pendingCommandsCount, failedCommandsCount, lastCommand] = await Promise.all([
      this.findLatestAttendanceSync(device.id),
      this.countPendingCommands(device.id),
      this.countFailedCommands(device.id),
      this.findLatestCommand(device.id),
    ]);
    const base = this.serializeDevice(device);
    const computedState = this.getDeviceComputedState(
      device,
      pendingCommandsCount,
      failedCommandsCount,
      lastCommand,
    );
    const online = computedState.state === 'online' ||
      computedState.state === 'communicating' ||
      computedState.state === 'pending_commands';

    return {
      ...base,
      name: device.alias || device.serialNumber,
      online,
      isOnline: online,
      status: computedState.state,
      computedState,
      lastSyncAt: lastSync?.acknowledgedAt ?? null,
      pendingCommandsCount,
      failedCommandsCount,
      lastCommandStatus: lastCommand?.status ?? null,
      minutesSinceLastSeen: computedState.minutesSinceLastSeen,
      companyName: device.company
        ? device.company.nombreFantasia || device.company.razonSocial
        : null,
    };
  }

  private getDeviceComputedState(
    device: Device,
    pendingCommandsCount: number,
    failedCommandsCount: number,
    lastCommand: DeviceCommand | null,
  ): DeviceComputedState {
    const lastSeen = device.lastSeen ?? null;
    const minutesSinceLastSeen = lastSeen
      ? Math.max(0, Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60_000))
      : null;

    if (!device.isActive) {
      return this.buildComputedState(
        'disabled',
        'Deshabilitado',
        'neutral',
        lastSeen,
        minutesSinceLastSeen,
        pendingCommandsCount,
        failedCommandsCount,
        lastCommand?.status ?? null,
      );
    }

    if (!lastSeen) {
      return this.buildComputedState(
        'never_seen',
        'Sin conexión inicial',
        'neutral',
        null,
        null,
        pendingCommandsCount,
        failedCommandsCount,
        lastCommand?.status ?? null,
      );
    }

    if (
      lastCommand?.status === DEVICE_COMMAND_STATUSES.FAILED ||
      lastCommand?.status === DEVICE_COMMAND_STATUSES.EXPIRED
    ) {
      return this.buildComputedState(
        'error',
        'Con errores',
        'danger',
        lastSeen,
        minutesSinceLastSeen,
        pendingCommandsCount,
        failedCommandsCount,
        lastCommand?.status ?? null,
      );
    }

    const ageMs = Date.now() - new Date(lastSeen).getTime();
    const onlineThresholdMs = this.getOnlineThresholdMs();
    const idleThresholdMs = this.getIdleThresholdMs();

    if (
      lastCommand?.status === DEVICE_COMMAND_STATUSES.SENT &&
      ageMs <= ACTIVE_COMMUNICATION_WINDOW_MS
    ) {
      return this.buildComputedState(
        'communicating',
        'Comunicando',
        'info',
        lastSeen,
        minutesSinceLastSeen,
        pendingCommandsCount,
        failedCommandsCount,
        lastCommand?.status ?? null,
      );
    }

    if (pendingCommandsCount > 0 && ageMs <= onlineThresholdMs) {
      return this.buildComputedState(
        'pending_commands',
        'Comandos pendientes',
        'warning',
        lastSeen,
        minutesSinceLastSeen,
        pendingCommandsCount,
        failedCommandsCount,
        lastCommand?.status ?? null,
      );
    }

    if (ageMs <= onlineThresholdMs) {
      return this.buildComputedState(
        'online',
        'Online',
        'success',
        lastSeen,
        minutesSinceLastSeen,
        pendingCommandsCount,
        failedCommandsCount,
        lastCommand?.status ?? null,
      );
    }

    if (ageMs <= idleThresholdMs) {
      return this.buildComputedState(
        'idle',
        'Inactivo reciente',
        'warning',
        lastSeen,
        minutesSinceLastSeen,
        pendingCommandsCount,
        failedCommandsCount,
        lastCommand?.status ?? null,
      );
    }

    return this.buildComputedState(
      'offline',
      'Offline',
      'danger',
      lastSeen,
      minutesSinceLastSeen,
      pendingCommandsCount,
      failedCommandsCount,
      lastCommand?.status ?? null,
    );
  }

  private buildComputedState(
    state: DeviceComputedStateName,
    label: string,
    severity: DeviceComputedState['severity'],
    lastSeen: Date | null,
    minutesSinceLastSeen: number | null,
    pendingCommandsCount: number,
    failedCommandsCount: number,
    lastCommandStatus: string | null,
  ): DeviceComputedState {
    return {
      state,
      label,
      severity,
      lastSeen,
      minutesSinceLastSeen,
      pendingCommandsCount,
      failedCommandsCount,
      lastCommandStatus,
    };
  }

  private getOnlineThresholdMs(): number {
    const rawThreshold = Number.parseInt(process.env.DEVICE_ONLINE_THRESHOLD_MS || '', 10);
    return Number.isFinite(rawThreshold) && rawThreshold > 0
      ? rawThreshold
      : DEFAULT_ONLINE_THRESHOLD_MS;
  }

  private getIdleThresholdMs(): number {
    const rawThreshold = Number.parseInt(process.env.DEVICE_IDLE_THRESHOLD_MS || '', 10);
    return Number.isFinite(rawThreshold) && rawThreshold > 0
      ? rawThreshold
      : DEFAULT_IDLE_THRESHOLD_MS;
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

  private countFailedCommands(deviceId: number): Promise<number> {
    return this.commandsRepo.count({
      where: {
        deviceId,
        status: In([
          DEVICE_COMMAND_STATUSES.FAILED,
          DEVICE_COMMAND_STATUSES.EXPIRED,
        ]),
      },
    });
  }

  private findLatestCommand(deviceId: number): Promise<DeviceCommand | null> {
    return this.commandsRepo.findOne({
      where: { deviceId },
      order: {
        requestedAt: 'DESC',
        id: 'DESC',
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
      .andWhere('COALESCE(command.failed_at, command.acknowledged_at, command.requested_at) >= :since', { since });

    if (companyId) {
      qb.andWhere('command.company_id = :companyId', { companyId });
    }

    return qb.getCount();
  }

  async requeueTimedOutCommands(): Promise<{ requeued: number; expired: number }> {
    const staleBefore = new Date(Date.now() - SENT_RETRY_AFTER_MS);
    const staleCommands = await this.commandsRepo
      .createQueryBuilder('command')
      .where('command.status = :status', { status: DEVICE_COMMAND_STATUSES.SENT })
      .andWhere('command.last_attempt_at IS NOT NULL')
      .andWhere('command.last_attempt_at < :staleBefore', { staleBefore })
      .getMany();

    let requeued = 0;
    let expired = 0;

    for (const command of staleCommands) {
      if (command.attempts >= command.maxAttempts) {
        command.status = DEVICE_COMMAND_STATUSES.EXPIRED;
        command.failedAt = new Date();
        command.error = 'El comando expiró por superar la cantidad máxima de intentos.';
        command.errorMessage = command.error;
        expired += 1;
      } else {
        command.status = DEVICE_COMMAND_STATUSES.PENDING;
        requeued += 1;
      }

      await this.commandsRepo.save(command);
    }

    return { requeued, expired };
  }

  private async cancelStaleAttendanceSyncs(deviceId: number): Promise<void> {
    const duplicateSince = new Date(Date.now() - FORCE_SYNC_DUPLICATE_WINDOW_MS);

    await this.commandsRepo
      .createQueryBuilder()
      .update(DeviceCommand)
      .set({
        status: DEVICE_COMMAND_STATUSES.CANCELLED,
        error: ACTIVE_SENT_REPLACEMENT_REASON,
        errorMessage: ACTIVE_SENT_REPLACEMENT_REASON,
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

  private async findCommandForDeviceResult(
    commandId: number,
    serialNumber: string | undefined,
  ): Promise<DeviceCommand | null> {
    const command = await this.commandsRepo.findOne({
      where: { id: commandId },
      relations: { device: true },
    });
    const normalizedSerialNumber = this.normalizeSerialNumber(serialNumber);

    if (!command) {
      logSecurity({
        event: 'adms_devicecmd_unknown_command',
        message: `devicecmd recibido para comando inexistente id=${commandId}`,
        serialNumber: normalizedSerialNumber,
      });
      return null;
    }

    if (!normalizedSerialNumber) {
      logSecurity({
        event: 'adms_devicecmd_missing_sn',
        message: `devicecmd recibido para comando ${commandId} sin SN verificable`,
        serialNumber: null,
      });
      return null;
    }

    if (command.device?.serialNumber !== normalizedSerialNumber) {
      logSecurity({
        event: 'adms_devicecmd_sn_mismatch',
        message:
          `devicecmd rechazado para comando ${commandId}: ` +
          `sn=${normalizedSerialNumber} device_sn=${command.device?.serialNumber || '-'}`,
        serialNumber: normalizedSerialNumber,
      });
      return null;
    }

    return command;
  }

  private async findLatestSentCommandForSerialNumberAndType(
    serialNumber: string,
    commandType: DeviceCommandType,
  ): Promise<DeviceCommand | null> {
    return this.commandsRepo
      .createQueryBuilder('command')
      .innerJoin('command.device', 'device')
      .where('device.serial_number = :serialNumber', { serialNumber })
      .andWhere('command.status = :status', {
        status: DEVICE_COMMAND_STATUSES.SENT,
      })
      .andWhere('command.command_type = :commandType', { commandType })
      .orderBy('command.sent_at', 'DESC')
      .addOrderBy('command.requested_at', 'DESC')
      .getOne();
  }

  private findLatestUserInfoCommand(deviceId: number): Promise<DeviceCommand | null> {
    return this.commandsRepo.findOne({
      where: {
        deviceId,
        commandType: DEVICE_COMMAND_TYPES.QUERY_USERINFO,
      },
      order: {
        acknowledgedAt: 'DESC',
        requestedAt: 'DESC',
        id: 'DESC',
      },
    });
  }

  private parseUserInfoRows(rawBody: string): Array<Record<string, string>> {
    return rawBody
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => this.parseUserInfoLine(line))
      .filter((row) => Object.keys(row).length > 0);
  }

  private parseUserInfoLine(line: string): Record<string, string> {
    const row: Record<string, string> = {};
    const normalizedLine = line.replace(/&/g, '\t');
    const keyValuePattern = /(?:^|[\t ]+)([A-Za-z][A-Za-z0-9_]*)=/g;
    const matches = Array.from(normalizedLine.matchAll(keyValuePattern));

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const key = match[1]?.trim().toUpperCase();
      if (!key) continue;

      const valueStart = (match.index ?? 0) + match[0].length;
      const nextMatch = matches[index + 1];
      const valueEnd = nextMatch?.index ?? normalizedLine.length;
      const value = normalizedLine.slice(valueStart, valueEnd).trim();
      row[key] = value;
    }

    if (Object.keys(row).length > 0) {
      return row;
    }

    const fields = line.split(/\s+/).filter(Boolean);
    if (fields.length >= 2) {
      row.PIN = fields[0];
      row.NAME = fields.slice(1).join(' ');
    }

    return row;
  }

  private getFirstValue(row: Record<string, string>, keys: string[]): string | null {
    for (const key of keys) {
      const value = row[key]?.trim();
      if (value) return value;
    }

    return null;
  }

  private hasPasswordValue(row: Record<string, string>): boolean | null {
    const password = this.getFirstValue(row, ['PASSWD', 'PASSWORD', 'PWD']);
    return password === null ? null : true;
  }

  private sanitizeUserInfoRow(row: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const blockedKeys = new Set(['PASSWD', 'PASSWORD', 'PWD']);

    for (const [key, value] of Object.entries(row)) {
      if (blockedKeys.has(key.toUpperCase())) {
        continue;
      }
      sanitized[key] = value;
    }

    return sanitized;
  }

  private resolveSnapshotMatch(
    companyId: string,
    employee: Employee | null,
    deviceName: string | null,
  ): { employeeId: string | null; status: DeviceUserMatchStatus } {
    if (!employee) {
      return { employeeId: null, status: DEVICE_USER_MATCH_STATUSES.DEVICE_ONLY };
    }

    if (employee.companyId !== companyId) {
      return { employeeId: null, status: DEVICE_USER_MATCH_STATUSES.PIN_CONFLICT };
    }

    return {
      employeeId: employee.id,
      status: this.namesAreCompatible(deviceName, employee)
        ? DEVICE_USER_MATCH_STATUSES.MATCHED
        : DEVICE_USER_MATCH_STATUSES.NAME_MISMATCH,
    };
  }

  private resolveReconciliationStatus(
    companyId: string,
    snapshot: DeviceUserSnapshot,
    employee: Employee | null,
  ): DeviceUserMatchStatus {
    return this.resolveSnapshotMatch(companyId, employee, snapshot.name).status;
  }

  private buildReconciliationRow(
    pin: string,
    snapshot: DeviceUserSnapshot | null,
    employee: Employee | null,
    status: DeviceUserMatchStatus,
  ): DeviceUserReconciliationRow {
    return {
      pin,
      deviceUser: snapshot
        ? {
            id: snapshot.id,
            pin: snapshot.pin,
            name: snapshot.name,
            privilege: snapshot.privilege,
            card: snapshot.card,
            passwordPresent: snapshot.passwordPresent,
            lastSeenAt: snapshot.lastSeenAt,
          }
        : null,
      employee: employee
        ? {
            id: employee.id,
            nombre: employee.nombre,
            apellido: employee.apellido,
            companyId: employee.companyId,
          }
        : null,
      employeeName: employee ? getEmployeeDisplayName(employee) : null,
      systemEmployeeName: employee ? getEmployeeDisplayName(employee) : null,
      deviceEmployeeName: snapshot?.name?.trim() || null,
      status,
    };
  }

  private namesAreCompatible(deviceName: string | null, employee: Employee): boolean {
    const normalizedDeviceName = this.normalizeNameForMatch(deviceName);
    if (!normalizedDeviceName) {
      return false;
    }

    const displayName = this.normalizeNameForMatch(getEmployeeDisplayName(employee));
    const deviceFullName = this.normalizeNameForMatch(getEmployeeDeviceName(employee));
    const apellidoNombre = this.normalizeNameForMatch(`${employee.apellido} ${employee.nombre}`);
    const nombreApellido = this.normalizeNameForMatch(`${employee.nombre} ${employee.apellido}`);
    const commaName = this.normalizeNameForMatch(`${employee.apellido}, ${employee.nombre}`);

    return (
      normalizedDeviceName === displayName ||
      normalizedDeviceName === deviceFullName ||
      normalizedDeviceName === apellidoNombre ||
      normalizedDeviceName === nombreApellido ||
      normalizedDeviceName === commaName
    );
  }

  private normalizeNameForMatch(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private getDataQueryCommandTypeForTable(table: string): DeviceCommandType | null {
    const normalizedTable = table?.trim().toUpperCase();
    if (normalizedTable === 'USERINFO') {
      return DEVICE_COMMAND_TYPES.QUERY_USERINFO;
    }

    if (
      normalizedTable === 'FINGERTMP' ||
      normalizedTable === 'FACE' ||
      normalizedTable === 'USERPIC' ||
      normalizedTable === 'BIODATA'
    ) {
      return DEVICE_COMMAND_TYPES.QUERY_BIOMETRICS;
    }

    return null;
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

  private assertCanSendCommand(commandType: string, user?: AuthenticatedUser): void {
    if (!user || user.isSuperAdmin) {
      return;
    }

    if (!user.companyId) {
      throw new ForbiddenException('El usuario no tiene empresa activa asignada.');
    }

    if (commandType === DEVICE_COMMAND_TYPES.CLEAR_ATTLOG) {
      throw new ForbiddenException('Solo super_admin puede borrar fichadas del reloj.');
    }

    if (
      commandType === DEVICE_COMMAND_TYPES.REBOOT &&
      user.companyRole !== CompanyRole.COMPANY_ADMIN
    ) {
      throw new ForbiddenException('Solo administradores pueden reiniciar relojes.');
    }

    if (
      user.companyRole !== CompanyRole.COMPANY_ADMIN &&
      user.companyRole !== CompanyRole.OPERATOR
    ) {
      throw new ForbiddenException('Se requieren permisos de operación.');
    }
  }

  private formatArgentinaDateTime(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .reduce<Record<string, string>>((acc, part) => {
        if (part.type !== 'literal') {
          acc[part.type] = part.value;
        }
        return acc;
      }, {});

    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  }

  private buildQueryAttlogCommand(payload?: Record<string, unknown> | null): string {
    const startTime = this.normalizePayloadDateTime(payload?.startTime);
    const endTime = this.normalizePayloadDateTime(payload?.endTime);

    if (startTime && endTime) {
      return `DATA QUERY ATTLOG StartTime=${startTime} EndTime=${endTime}`;
    }

    return FORCE_SYNC_COMMAND;
  }

  private buildUpdateUserInfoCommand(employee: DeviceEmployeeSyncRecord): string {
    const pin = this.sanitizeAdmsValue(employee.id, 24);
    const name = this.sanitizeAdmsValue(getEmployeeDeviceName(employee), 48);

    if (!name) {
      throw new BadRequestException('El empleado no tiene nombre cargado para enviarlo al reloj.');
    }

    return `DATA UPDATE USERINFO PIN=${pin}\tName=${name}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000`;
  }

  private sanitizeAdmsValue(value: string, maxLength: number): string {
    return value
      .replace(/[\r\n\t=]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  private normalizePayloadDateTime(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().replace('T', ' ').slice(0, 19);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
      return null;
    }

    return normalized.length === 16 ? `${normalized}:00` : normalized;
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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { Employee } from './employee.entity';
import { EmployeeTimeBankLedger } from './employee-time-bank-ledger.entity';
import { Position } from './position.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { TimeBankAdjustmentDto } from './dto/time-bank-adjustment.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { DevicesService } from '../devices/devices.service';
import { AdminAuditService } from '../admin/admin-audit.service';

type ImportField =
  | 'documento'
  | 'nombre'
  | 'apellido'
  | 'sector'
  | 'puesto'
  | 'perfilHorario'
  | 'activo';

interface RawImportRow {
  rowNumber: number;
  values: Partial<Record<ImportField, string>>;
}

export interface EmployeeImportNormalizedRow {
  rowNumber: number;
  documento: string;
  nombre: string;
  apellido: string;
  departmentName: string | null;
  departmentId: string | null;
  positionName: string | null;
  positionId: string | null;
  scheduleProfileName: string | null;
  scheduleProfileId: string | null;
  isActive: boolean;
  warnings: string[];
}

export interface EmployeeImportInvalidRow {
  rowNumber: number;
  documento: string | null;
  nombre: string | null;
  apellido: string | null;
  errors: string[];
  warnings: string[];
}

export interface EmployeeImportPreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
  normalizedRows: EmployeeImportNormalizedRow[];
  errors: EmployeeImportInvalidRow[];
}

export interface EmployeeImportConfirmResult {
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ rowNumber: number; documento: string; errors: string[] }>;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(ScheduleProfile)
    private readonly scheduleProfilesRepo: Repository<ScheduleProfile>,
    @InjectRepository(EmployeeTimeBankLedger)
    private readonly timeBankLedgerRepo: Repository<EmployeeTimeBankLedger>,
    @InjectRepository(Department)
    private readonly departmentsRepo: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionsRepo: Repository<Position>,
    private readonly devices: DevicesService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  findAll(
    user: AuthenticatedUser,
    filters: {
      includeInactive?: string;
      departmentId?: string;
      positionId?: string;
    } = {},
  ): Promise<Employee[]> {
    const companyId = getCompanyScope(user);
    const qb = this.repo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.scheduleProfile', 'scheduleProfile')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.position', 'position');

    if (companyId) {
      qb.where('employee.company_id = :companyId', { companyId });
    } else {
      qb.where('1 = 1');
    }

    if (filters.includeInactive !== 'true') {
      qb.andWhere('employee.is_active = true');
    }
    if (filters.departmentId) {
      qb.andWhere('employee.department_id = :departmentId', { departmentId: filters.departmentId });
    }
    if (filters.positionId) {
      qb.andWhere('employee.position_id = :positionId', { positionId: filters.positionId });
    }

    return qb.orderBy('employee.apellido', 'ASC').addOrderBy('employee.nombre', 'ASC').addOrderBy('employee.id', 'ASC').getMany();
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Employee> {
    const employee = await this.findScopedEmployee(id, user);
    if (!employee) {
      throw new NotFoundException(`Empleado ${id} no encontrado`);
    }
    return employee;
  }

  async create(dto: CreateEmployeeDto, user: AuthenticatedUser): Promise<Employee> {
    const resolvedCompanyId = this.resolveWritableCompanyId(dto.companyId, user);
    const existing = user.isSuperAdmin
      ? await this.repo.findOneBy({ id: dto.id })
      : await this.repo.findOneBy({ id: dto.id, companyId: resolvedCompanyId });
    if (existing) {
      throw new ConflictException(`Ya existe un empleado con DNI ${dto.id}`);
    }

    const employee = this.repo.create({
      id: dto.id,
      nombre: dto.nombre,
      apellido: dto.apellido,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
      entryTime: dto.entryTime ?? null,
      exitTime: dto.exitTime ?? null,
      scheduleProfileId: await this.resolveScheduleProfileId(
        dto.scheduleProfileId,
        resolvedCompanyId,
      ),
      departmentId: await this.resolveDepartmentId(dto.departmentId, resolvedCompanyId),
      positionId: await this.resolvePositionId(dto.positionId, resolvedCompanyId),
      isActive: dto.isActive ?? true,
      inactiveAt: dto.isActive === false ? new Date() : null,
      inactiveReason: dto.isActive === false ? dto.inactiveReason ?? null : null,
      companyId: resolvedCompanyId,
    });

    const createdEmployee = await this.repo.save(employee);
    await this.adminAuditService.logConfigChange(
      resolvedCompanyId,
      'employee_created',
      'employee',
      createdEmployee.id,
      null,
      {
        scheduleProfileId: createdEmployee.scheduleProfileId,
        departmentId: createdEmployee.departmentId,
        positionId: createdEmployee.positionId,
        isActive: createdEmployee.isActive,
      },
      'Empleado creado',
      user.id,
    );

    return createdEmployee;
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    user: AuthenticatedUser,
  ): Promise<Employee> {
    const employee = await this.findOne(id, user);
    const resolvedCompanyId =
      dto.companyId !== undefined
        ? this.resolveWritableCompanyId(dto.companyId, user)
        : user.isSuperAdmin
          ? employee.companyId
          : this.resolveWritableCompanyId(undefined, user);
    const before = {
      scheduleProfileId: employee.scheduleProfileId,
      departmentId: employee.departmentId,
      positionId: employee.positionId,
      isActive: employee.isActive,
    };

    if (dto.nombre !== undefined) employee.nombre = dto.nombre;
    if (dto.apellido !== undefined) employee.apellido = dto.apellido;
    if (dto.telefono !== undefined) employee.telefono = dto.telefono;
    if (dto.email !== undefined) employee.email = dto.email;
    if (dto.entryTime !== undefined) employee.entryTime = dto.entryTime;
    if (dto.exitTime !== undefined) employee.exitTime = dto.exitTime;
    if (dto.scheduleProfileId !== undefined) {
      employee.scheduleProfileId = await this.resolveScheduleProfileId(
        dto.scheduleProfileId,
        resolvedCompanyId,
      );
    }
    if (dto.departmentId !== undefined) {
      employee.departmentId = await this.resolveDepartmentId(
        dto.departmentId,
        resolvedCompanyId,
      );
    }
    if (dto.positionId !== undefined) {
      employee.positionId = await this.resolvePositionId(
        dto.positionId,
        resolvedCompanyId,
      );
    }
    if (dto.isActive !== undefined && dto.isActive !== employee.isActive) {
      employee.isActive = dto.isActive;
      employee.inactiveAt = dto.isActive ? null : new Date();
      employee.inactiveReason = dto.isActive ? null : dto.inactiveReason ?? employee.inactiveReason ?? null;
    } else if (dto.inactiveReason !== undefined) {
      employee.inactiveReason = dto.inactiveReason;
    }
    if (
      dto.companyId !== undefined ||
      (!user.isSuperAdmin && employee.companyId !== resolvedCompanyId)
    ) {
      employee.companyId = resolvedCompanyId;
      if (employee.scheduleProfileId) {
        employee.scheduleProfileId = await this.resolveScheduleProfileId(
          employee.scheduleProfileId,
          resolvedCompanyId,
        );
      }
      if (employee.departmentId) {
        employee.departmentId = await this.resolveDepartmentId(
          employee.departmentId,
          resolvedCompanyId,
        );
      }
      if (employee.positionId) {
        employee.positionId = await this.resolvePositionId(
          employee.positionId,
          resolvedCompanyId,
        );
      }
    }

    const updatedEmployee = await this.repo.save(employee);
    const after = {
      scheduleProfileId: updatedEmployee.scheduleProfileId,
      departmentId: updatedEmployee.departmentId,
      positionId: updatedEmployee.positionId,
      isActive: updatedEmployee.isActive,
    };

    if (before.isActive !== after.isActive) {
      await this.adminAuditService.logConfigChange(
        updatedEmployee.companyId,
        'employee_status_changed',
        'employee',
        updatedEmployee.id,
        { isActive: before.isActive },
        { isActive: after.isActive },
        'Cambio de estado de empleado',
        user.id,
      );
    }

    if (before.departmentId !== after.departmentId) {
      await this.adminAuditService.logConfigChange(
        updatedEmployee.companyId,
        'employee_department_changed',
        'employee',
        updatedEmployee.id,
        { departmentId: before.departmentId },
        { departmentId: after.departmentId },
        'Cambio de departamento de empleado',
        user.id,
      );
    }

    if (before.positionId !== after.positionId) {
      await this.adminAuditService.logConfigChange(
        updatedEmployee.companyId,
        'employee_position_changed',
        'employee',
        updatedEmployee.id,
        { positionId: before.positionId },
        { positionId: after.positionId },
        'Cambio de puesto de empleado',
        user.id,
      );
    }

    if (before.scheduleProfileId !== after.scheduleProfileId) {
      await this.adminAuditService.logConfigChange(
        updatedEmployee.companyId,
        after.scheduleProfileId ? 'employee_schedule_profile_assigned' : 'employee_schedule_profile_removed',
        'employee',
        updatedEmployee.id,
        { scheduleProfileId: before.scheduleProfileId },
        { scheduleProfileId: after.scheduleProfileId },
        'Cambio de perfil horario de empleado',
        user.id,
      );
    }

    return updatedEmployee;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ success: true }> {
    const employee = await this.repo.findOne({
      where: user.isSuperAdmin ? { id } : { id, companyId: getCompanyScope(user) },
      relations: {
        userAccount: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Empleado ${id} no encontrado`);
    }

    if (employee.userAccount) {
      throw new ConflictException(
        'No se puede eliminar el empleado porque tiene una cuenta de acceso vinculada',
      );
    }

    await this.repo.remove(employee);
    await this.adminAuditService.logConfigChange(
      employee.companyId,
      'employee_deleted',
      'employee',
      employee.id,
      {
        scheduleProfileId: employee.scheduleProfileId,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        isActive: employee.isActive,
      },
      null,
      'Empleado eliminado',
      user.id,
    );
    return { success: true as const };
  }

  async requestImportFromDevice(deviceId: number, user: AuthenticatedUser) {
    const result = await this.devices.enqueueEmployeeImportCommands(
      deviceId,
      user.username,
      user,
    );

    return {
      ok: true as const,
      device: {
        id: result.device.id,
        serialNumber: result.device.serialNumber,
      },
      commands: result.commands.map((command) => ({
        id: command.id,
        commandType: command.commandType,
        command: command.command,
        status: command.status,
      })),
      message:
        'Importación solicitada. El reloj enviará USERINFO en el próximo heartbeat.',
    };
  }

  async requestExportEmployeeToDevice(
    deviceId: number,
    employeeId: string,
    user: AuthenticatedUser,
  ) {
    const employee = await this.findOne(employeeId, user);

    const result = await this.devices.enqueueEmployeeExportCommands(
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

    const command = result.commands[0];

    return {
      ok: true as const,
      device: {
        id: result.device.id,
        serialNumber: result.device.serialNumber,
      },
      command: {
        id: command.id,
        status: command.status,
      },
      message: `Empleado ${employee.id} encolado para enviar al reloj.`,
    };
  }

  async getTimeBank(
    employeeId: string,
    user: AuthenticatedUser,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const employee = await this.findOne(employeeId, user);
    if (!employee.companyId) {
      throw new BadRequestException('El empleado no tiene empresa asignada.');
    }

    const qb = this.timeBankLedgerRepo
      .createQueryBuilder('movement')
      .where('movement.company_id = :companyId', { companyId: employee.companyId })
      .andWhere('movement.employee_id = :employeeId', { employeeId: employee.id });

    if (dateFrom) qb.andWhere('movement.date >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('movement.date <= :dateTo', { dateTo });

    const movements = await qb.orderBy('movement.date', 'ASC').addOrderBy('movement.created_at', 'ASC').getMany();
    const totalCreditMinutes = movements.filter((movement) => movement.minutes > 0).reduce((total, movement) => total + movement.minutes, 0);
    const totalDebitMinutes = movements.filter((movement) => movement.minutes < 0).reduce((total, movement) => total + Math.abs(movement.minutes), 0);

    return {
      employee: {
        id: employee.id,
        nombre: employee.nombre,
        apellido: employee.apellido,
      },
      movements: movements.map((movement) => ({
        id: movement.id,
        date: movement.date,
        type: movement.type,
        minutes: movement.minutes,
        source: movement.source,
        reason: movement.reason,
        createdAt: movement.createdAt,
      })),
      totalCreditMinutes,
      totalDebitMinutes,
      balanceMinutes: totalCreditMinutes - totalDebitMinutes,
    };
  }

  async createTimeBankAdjustment(
    employeeId: string,
    dto: TimeBankAdjustmentDto,
    user: AuthenticatedUser,
  ) {
    const employee = await this.findOne(employeeId, user);
    if (!employee.companyId) {
      throw new BadRequestException('El empleado no tiene empresa asignada.');
    }
    const signedMinutes = dto.type === 'debit' ? -dto.minutes : dto.minutes;
    const entry = this.timeBankLedgerRepo.create({
      companyId: employee.companyId,
      employeeId: employee.id,
      date: dto.date,
      attendanceDaySummaryId: null,
      type: dto.type,
      minutes: signedMinutes,
      source: 'manual_adjustment',
      reason: dto.reason ?? null,
      createdByUserId: user.id,
    });

    return this.timeBankLedgerRepo.save(entry);
  }

  async previewImport(
    file: { originalname?: string; mimetype?: string; buffer?: Buffer },
    user: AuthenticatedUser,
    requestedCompanyId?: string | null,
  ): Promise<EmployeeImportPreviewResult> {
    const companyId = this.resolveImportCompanyId(requestedCompanyId, user);
    const rows = await this.parseImportFile(file);
    return this.validateImportRows(rows, companyId);
  }

  async confirmImport(
    input: { rows?: EmployeeImportNormalizedRow[]; companyId?: string | null; updateExisting?: boolean },
    user: AuthenticatedUser,
  ): Promise<EmployeeImportConfirmResult> {
    const companyId = this.resolveImportCompanyId(input.companyId, user);
    const updateExisting = input.updateExisting === true;
    if (updateExisting) {
      throw new BadRequestException('La actualización masiva de empleados existentes no está habilitada en esta etapa.');
    }

    const rows = Array.isArray(input.rows) ? input.rows : [];
    if (rows.length === 0) {
      throw new BadRequestException('No hay filas válidas para importar.');
    }

    const rawRows: RawImportRow[] = rows.map((row) => ({
      rowNumber: row.rowNumber,
      values: {
        documento: row.documento,
        nombre: row.nombre,
        apellido: row.apellido,
        sector: row.departmentName ?? '',
        puesto: row.positionName ?? '',
        perfilHorario: row.scheduleProfileName ?? '',
        activo: row.isActive ? 'sí' : 'no',
      },
    }));
    const preview = await this.validateImportRows(rawRows, companyId);
    if (preview.normalizedRows.length === 0) {
      return {
        createdCount: 0,
        skippedCount: 0,
        errorCount: preview.errors.length,
        errors: preview.errors.map((error) => ({
          rowNumber: error.rowNumber,
          documento: error.documento ?? '',
          errors: error.errors,
        })),
      };
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors: EmployeeImportConfirmResult['errors'] = [];

    for (const row of preview.normalizedRows) {
      const exists = await this.repo.findOneBy({ id: row.documento });
      if (exists) {
        skippedCount += 1;
        continue;
      }

      try {
        await this.repo.save(
          this.repo.create({
            id: row.documento,
            nombre: row.nombre,
            apellido: row.apellido,
            telefono: null,
            email: null,
            entryTime: null,
            exitTime: null,
            scheduleProfileId: row.scheduleProfileId,
            departmentId: row.departmentId,
            positionId: row.positionId,
            isActive: row.isActive,
            inactiveAt: row.isActive ? null : new Date(),
            inactiveReason: row.isActive ? null : 'Importado como inactivo',
            companyId,
          }),
        );
        createdCount += 1;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') {
          skippedCount += 1;
        } else {
          errors.push({
            rowNumber: row.rowNumber,
            documento: row.documento,
            errors: ['No se pudo crear este empleado. Revisá los datos e intentá nuevamente.'],
          });
        }
      }
    }

    return {
      createdCount,
      skippedCount,
      errorCount: errors.length,
      errors,
    };
  }

  private async findScopedEmployee(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Employee | null> {
    if (user.isSuperAdmin) {
      return this.repo.findOne({
        where: { id },
        relations: {
          scheduleProfile: true,
          department: true,
          position: true,
        },
      });
    }

    return this.repo.findOne({
      where: { id, companyId: getCompanyScope(user) },
      relations: {
        scheduleProfile: true,
        department: true,
        position: true,
      },
    });
  }

  private resolveImportCompanyId(
    requestedCompanyId: string | null | undefined,
    user: AuthenticatedUser,
  ): string {
    if (user.isSuperAdmin) {
      if (!requestedCompanyId) {
        throw new BadRequestException('Para importar empleados como super admin, seleccioná una empresa.');
      }
      return requestedCompanyId;
    }

    const companyId = getCompanyScope(user);
    if (requestedCompanyId !== undefined && requestedCompanyId !== null && requestedCompanyId !== companyId) {
      throw new ForbiddenException('No podés importar empleados en otra empresa.');
    }
    return companyId!;
  }

  private async parseImportFile(file: { originalname?: string; mimetype?: string; buffer?: Buffer }): Promise<RawImportRow[]> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Subí un archivo CSV o Excel para previsualizar.');
    }

    const filename = (file.originalname ?? '').toLowerCase();
    if (filename.endsWith('.xlsx')) {
      return this.parseExcelRows(file.buffer);
    }
    if (filename.endsWith('.csv') || file.mimetype?.includes('csv') || file.mimetype?.includes('text/plain')) {
      return this.parseCsvRows(file.buffer.toString('utf8'));
    }

    throw new BadRequestException('Formato no permitido. Usá un archivo CSV o Excel (.xlsx).');
  }

  private async parseExcelRows(buffer: Buffer): Promise<RawImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('El Excel no tiene hojas para importar.');
    }

    const headers = this.mapHeaders((worksheet.getRow(1).values as unknown[]).slice(1));
    const rows: RawImportRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = (row.values as unknown[]).slice(1);
      const parsed = this.parseRowValues(headers, values);
      if (Object.values(parsed).some((value) => value.trim() !== '')) {
        rows.push({ rowNumber, values: parsed });
      }
    });
    return rows;
  }

  private parseCsvRows(content: string): RawImportRow[] {
    const rows = this.parseCsv(content.replace(/^\uFEFF/, ''));
    if (rows.length === 0) {
      throw new BadRequestException('El CSV no tiene filas para importar.');
    }
    const headers = this.mapHeaders(rows[0]);
    return rows.slice(1).reduce<RawImportRow[]>((acc, values, index) => {
      const parsed = this.parseRowValues(headers, values);
      if (Object.values(parsed).some((value) => value.trim() !== '')) {
        acc.push({ rowNumber: index + 2, values: parsed });
      }
      return acc;
    }, []);
  }

  private parseCsv(content: string): string[][] {
    const rows: string[][] = [];
    let current = '';
    let row: string[] = [];
    let quoted = false;

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const next = content[index + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(current);
        current = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index += 1;
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }

    if (current !== '' || row.length > 0) {
      row.push(current);
      rows.push(row);
    }

    return rows;
  }

  private mapHeaders(headers: unknown[]): Array<ImportField | null> {
    return headers.map((header) => this.resolveImportField(String(header ?? '')));
  }

  private parseRowValues(headers: Array<ImportField | null>, values: unknown[]): Partial<Record<ImportField, string>> {
    const parsed: Partial<Record<ImportField, string>> = {};
    headers.forEach((field, index) => {
      if (!field) return;
      parsed[field] = this.cellToString(values[index]);
    });
    return parsed;
  }

  private cellToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object' && 'text' in value) return String((value as { text?: unknown }).text ?? '').trim();
    if (typeof value === 'object' && 'result' in value) return String((value as { result?: unknown }).result ?? '').trim();
    return String(value).trim();
  }

  private resolveImportField(header: string): ImportField | null {
    const normalized = this.normalizeText(header);
    const aliases: Record<string, ImportField> = {
      documento: 'documento',
      dni: 'documento',
      cuil: 'documento',
      id: 'documento',
      nombre: 'nombre',
      nombres: 'nombre',
      apellido: 'apellido',
      apellidos: 'apellido',
      sector: 'sector',
      departamento: 'sector',
      puesto: 'puesto',
      cargo: 'puesto',
      perfil: 'perfilHorario',
      perfilhorario: 'perfilHorario',
      horario: 'perfilHorario',
      activo: 'activo',
      estado: 'activo',
    };
    return aliases[normalized] ?? null;
  }

  private async validateImportRows(rows: RawImportRow[], companyId: string): Promise<EmployeeImportPreviewResult> {
    const [departments, positions, profiles, existingEmployees] = await Promise.all([
      this.departmentsRepo.find({ where: { companyId } }),
      this.positionsRepo.find({ where: { companyId } }),
      this.scheduleProfilesRepo.find({ where: { companyId } }),
      this.repo.find({ select: { id: true } }),
    ]);
    const departmentsByName = new Map(departments.map((department) => [this.normalizeText(department.name), department]));
    const positionsByName = new Map(positions.map((position) => [this.normalizeText(position.name), position]));
    const profilesByName = new Map(profiles.map((profile) => [this.normalizeText(profile.name), profile]));
    const existingIds = new Set(existingEmployees.map((employee) => employee.id));
    const seenIds = new Set<string>();
    const normalizedRows: EmployeeImportNormalizedRow[] = [];
    const errors: EmployeeImportInvalidRow[] = [];
    const warnings: string[] = [];

    for (const row of rows) {
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];
      const documento = this.cleanDocument(row.values.documento);
      const nombre = (row.values.nombre ?? '').trim();
      const apellido = (row.values.apellido ?? '').trim();
      const sector = (row.values.sector ?? '').trim();
      const puesto = (row.values.puesto ?? '').trim();
      const perfilHorario = (row.values.perfilHorario ?? '').trim();
      const activeValue = (row.values.activo ?? '').trim();

      if (!documento) rowErrors.push('Documento obligatorio.');
      if (!nombre) rowErrors.push('Nombre obligatorio.');
      if (!apellido) rowErrors.push('Apellido obligatorio.');
      if (documento && seenIds.has(documento)) rowErrors.push('Documento duplicado dentro del archivo.');
      if (documento && existingIds.has(documento)) rowErrors.push('Ya existe un empleado con ese documento.');

      let departmentId: string | null = null;
      if (sector) {
        const department = departmentsByName.get(this.normalizeText(sector));
        if (!department || !department.isActive) rowErrors.push('El sector/departamento no existe o está inactivo.');
        else departmentId = department.id;
      }

      let positionId: string | null = null;
      if (puesto) {
        const position = positionsByName.get(this.normalizeText(puesto));
        if (!position || !position.isActive) rowErrors.push('El puesto/cargo no existe o está inactivo.');
        else positionId = position.id;
      }

      let scheduleProfileId: string | null = null;
      if (perfilHorario) {
        const profile = profilesByName.get(this.normalizeText(perfilHorario));
        if (!profile) rowWarnings.push('El perfil horario no existe; el empleado quedará sin perfil asignado.');
        else scheduleProfileId = profile.id;
      }

      const active = this.parseActiveValue(activeValue);
      if (active === null) rowErrors.push('El estado activo no es válido. Usá Sí/No, Activo/Inactivo o dejalo vacío.');

      if (documento) seenIds.add(documento);

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          documento: documento || null,
          nombre: nombre || null,
          apellido: apellido || null,
          errors: rowErrors,
          warnings: rowWarnings,
        });
      } else {
        normalizedRows.push({
          rowNumber: row.rowNumber,
          documento,
          nombre,
          apellido,
          departmentName: sector || null,
          departmentId,
          positionName: puesto || null,
          positionId,
          scheduleProfileName: perfilHorario || null,
          scheduleProfileId,
          isActive: active ?? true,
          warnings: rowWarnings,
        });
      }

      for (const warning of rowWarnings) {
        warnings.push(`Fila ${row.rowNumber}: ${warning}`);
      }
    }

    return {
      totalRows: rows.length,
      validRows: normalizedRows.length,
      invalidRows: errors.length,
      warnings,
      normalizedRows,
      errors,
    };
  }

  private cleanDocument(value: string | undefined): string {
    const cleaned = (value ?? '').trim().replace(/\s+/g, '').replace(/[.-]/g, '');
    return cleaned;
  }

  private parseActiveValue(value: string): boolean | null {
    if (!value) return true;
    const normalized = this.normalizeText(value);
    if (['si', 'sí', 's', 'true', '1', 'activo', 'activa'].includes(normalized)) return true;
    if (['no', 'n', 'false', '0', 'inactivo', 'inactiva', 'baja'].includes(normalized)) return false;
    return null;
  }

  private normalizeText(value: string): string {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private resolveWritableCompanyId(
    requestedCompanyId: string | null | undefined,
    user: AuthenticatedUser,
  ): string | null {
    if (user.isSuperAdmin) {
      return requestedCompanyId ?? null;
    }

    const companyId = getCompanyScope(user);
    if (requestedCompanyId !== undefined && requestedCompanyId !== companyId) {
      throw new ForbiddenException(
        'No podés operar empleados fuera de tu empresa.',
      );
    }

    return companyId;
  }

  private async resolveScheduleProfileId(
    requestedProfileId: string | null | undefined,
    companyId: string | null,
  ): Promise<string | null> {
    if (!requestedProfileId) {
      return null;
    }

    if (!companyId) {
      throw new ForbiddenException(
        'El perfil horario solo puede asignarse a empleados con empresa.',
      );
    }

    const profile = await this.scheduleProfilesRepo.findOneBy({
      id: requestedProfileId,
      companyId,
    });

    if (!profile) {
      throw new NotFoundException('Perfil horario no encontrado para esta empresa');
    }

    return profile.id;
  }

  private async resolveDepartmentId(
    requestedDepartmentId: string | null | undefined,
    companyId: string | null,
  ): Promise<string | null> {
    if (!requestedDepartmentId) {
      return null;
    }
    if (!companyId) {
      throw new ForbiddenException('El departamento solo puede asignarse a empleados con empresa.');
    }
    const department = await this.departmentsRepo.findOneBy({
      id: requestedDepartmentId,
      companyId,
      isActive: true,
    });
    if (!department) {
      throw new NotFoundException('Departamento no encontrado para esta empresa');
    }
    return department.id;
  }

  private async resolvePositionId(
    requestedPositionId: string | null | undefined,
    companyId: string | null,
  ): Promise<string | null> {
    if (!requestedPositionId) {
      return null;
    }
    if (!companyId) {
      throw new ForbiddenException('El puesto solo puede asignarse a empleados con empresa.');
    }
    const position = await this.positionsRepo.findOneBy({
      id: requestedPositionId,
      companyId,
      isActive: true,
    });
    if (!position) {
      throw new NotFoundException('Puesto no encontrado para esta empresa');
    }
    return position.id;
  }
}

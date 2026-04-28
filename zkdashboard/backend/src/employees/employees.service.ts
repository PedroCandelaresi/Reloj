import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(ScheduleProfile)
    private readonly scheduleProfilesRepo: Repository<ScheduleProfile>,
    private readonly devices: DevicesService,
  ) {}

  findAll(user: AuthenticatedUser): Promise<Employee[]> {
    const companyId = getCompanyScope(user);

    return this.repo.find({
      where: companyId ? { companyId } : {},
      relations: {
        scheduleProfile: true,
      },
      order: {
        apellido: 'ASC',
        nombre: 'ASC',
        id: 'ASC',
      },
    });
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
      companyId: resolvedCompanyId,
    });

    return this.repo.save(employee);
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    user: AuthenticatedUser,
  ): Promise<Employee> {
    const employee = await this.findOne(id, user);
    const resolvedCompanyId = this.resolveWritableCompanyId(dto.companyId, user);

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
    }

    return this.repo.save(employee);
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

  async importUserInfoFromDevice(
    companyId: string,
    rawBody: string,
  ): Promise<{ created: number; updated: number; skipped: number }> {
    const rows = this.parseUserInfoRows(rawBody);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const employeeId = this.getFirstValue(row, ['PIN', 'USERID', 'UID', 'ID']);
      if (!employeeId) {
        skipped += 1;
        continue;
      }

      const fullName =
        this.getFirstValue(row, ['NAME', 'NOMBRE', 'USERNAME']) ||
        `Usuario ${employeeId}`;
      const parsedName = this.splitDeviceName(fullName);
      const existing = await this.repo.findOneBy({ id: employeeId });
      if (existing && existing.companyId !== companyId) {
        skipped += 1;
        continue;
      }

      if (existing) {
        existing.nombre = parsedName.nombre;
        existing.apellido = parsedName.apellido;
        await this.repo.save(existing);
        updated += 1;
      } else {
        await this.repo.save(
          this.repo.create({
            id: employeeId,
            nombre: parsedName.nombre,
            apellido: parsedName.apellido,
            companyId,
          }),
        );
        created += 1;
      }
    }

    return { created, updated, skipped };
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
        },
      });
    }

    return this.repo.findOne({
      where: { id, companyId: getCompanyScope(user) },
      relations: {
        scheduleProfile: true,
      },
    });
  }

  private parseUserInfoRows(rawBody: string): Array<Record<string, string>> {
    return rawBody
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const row: Record<string, string> = {};
        for (const part of line.split(/\t|&/)) {
          const separatorIndex = part.indexOf('=');
          if (separatorIndex <= 0) continue;
          const key = part.slice(0, separatorIndex).trim().toUpperCase();
          const value = part.slice(separatorIndex + 1).trim();
          if (key) row[key] = value;
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
      })
      .filter((row) => Object.keys(row).length > 0);
  }

  private getFirstValue(row: Record<string, string>, keys: string[]): string | null {
    for (const key of keys) {
      const value = row[key]?.trim();
      if (value) return value;
    }

    return null;
  }

  private splitDeviceName(fullName: string): { nombre: string; apellido: string } {
    const normalized = fullName.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return { nombre: 'Sin nombre', apellido: 'Sin apellido' };
    }

    if (normalized.includes(',')) {
      const [apellido, nombre] = normalized.split(',', 2).map((part) => part.trim());
      return {
        nombre: nombre || apellido || 'Sin nombre',
        apellido: apellido || 'Sin apellido',
      };
    }

    const parts = normalized.split(' ');
    if (parts.length === 1) {
      return { nombre: parts[0], apellido: 'Sin apellido' };
    }

    return {
      nombre: parts.slice(1).join(' '),
      apellido: parts[0],
    };
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
}

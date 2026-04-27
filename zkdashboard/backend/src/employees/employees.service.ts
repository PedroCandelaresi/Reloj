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

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(ScheduleProfile)
    private readonly scheduleProfilesRepo: Repository<ScheduleProfile>,
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

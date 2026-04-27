import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminUser } from '../users/admin-user.entity';
import { Employee } from '../employees/employee.entity';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateScheduleProfileDto } from './dto/create-schedule-profile.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { UpdateScheduleProfileDto } from './dto/update-schedule-profile.dto';
import { AssignCompanyUserDto } from './dto/assign-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompanyMembership } from './company-membership.entity';
import { Company } from './company.entity';
import { ScheduleProfile } from './schedule-profile.entity';
import { normalizeCuit } from './validation/cuit.util';

function trimRequired(value: string): string {
  return value.trim();
}

function trimOptional(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
    @InjectRepository(CompanyMembership)
    private readonly membershipsRepo: Repository<CompanyMembership>,
    @InjectRepository(ScheduleProfile)
    private readonly scheduleProfilesRepo: Repository<ScheduleProfile>,
    @InjectRepository(AdminUser)
    private readonly usersRepo: Repository<AdminUser>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
  ) {}

  private toCompany(company: Company) {
    return {
      id: company.id,
      cuit: company.cuit,
      razonSocial: company.razonSocial,
      nombreFantasia: company.nombreFantasia,
      isActive: company.isActive,
      defaultEntryTime: company.defaultEntryTime,
      defaultExitTime: company.defaultExitTime,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  private toEmployee(employee: Employee) {
    const membership = employee.userAccount?.memberships?.find(
      (candidate) => candidate.companyId === employee.companyId,
    );

    return {
      id: employee.id,
      nombre: employee.nombre,
      apellido: employee.apellido,
      telefono: employee.telefono,
      email: employee.email,
      companyId: employee.companyId,
      userAccount: employee.userAccount
        ? {
            id: employee.userAccount.id,
            username: employee.userAccount.username,
            isSuperAdmin: employee.userAccount.isSuperAdmin,
            role: membership?.role ?? null,
          }
        : null,
    };
  }

  private toCompanyUser(membership: CompanyMembership) {
    return {
      id: membership.id,
      companyId: membership.companyId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: membership.user
        ? {
            id: membership.user.id,
            username: membership.user.username,
            isSuperAdmin: membership.user.isSuperAdmin,
            employeeId: membership.user.employeeId,
          }
        : null,
      employee: membership.user?.employee
        ? {
            id: membership.user.employee.id,
            nombre: membership.user.employee.nombre,
            apellido: membership.user.employee.apellido,
            telefono: membership.user.employee.telefono,
            email: membership.user.employee.email,
            companyId: membership.user.employee.companyId,
          }
        : null,
    };
  }

  private toScheduleProfile(profile: ScheduleProfile) {
    return {
      id: profile.id,
      companyId: profile.companyId,
      name: profile.name,
      entryTime: profile.entryTime,
      exitTime: profile.exitTime,
      summerEntryTime: profile.summerEntryTime,
      summerExitTime: profile.summerExitTime,
      summerStart: profile.summerStart,
      summerEnd: profile.summerEnd,
      winterEntryTime: profile.winterEntryTime,
      winterExitTime: profile.winterExitTime,
      winterStart: profile.winterStart,
      winterEnd: profile.winterEnd,
      lateToleranceMinutes: profile.lateToleranceMinutes ?? 0,
      earlyDepartureToleranceMinutes: profile.earlyDepartureToleranceMinutes ?? 0,
      expectedMinutesPerDay: profile.expectedMinutesPerDay ?? null,
      workDays: profile.workDays ?? null,
      breakMinutes: profile.breakMinutes ?? 0,
      overtimeAfterMinutes: profile.overtimeAfterMinutes ?? 0,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private async findCompanyEntity(id: string): Promise<Company> {
    const company = await this.companiesRepo.findOneBy({ id });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return company;
  }

  private async ensureCompanyIsActive(id: string): Promise<Company> {
    const company = await this.findCompanyEntity(id);
    if (!company.isActive) {
      throw new ConflictException('La empresa está inactiva');
    }

    return company;
  }

  private async ensureCuitAvailable(cuit: string, excludedId?: string) {
    const existing = await this.companiesRepo.findOneBy({ cuit });

    if (existing && existing.id !== excludedId) {
      throw new ConflictException(`Ya existe una empresa registrada con CUIT ${cuit}`);
    }
  }

  private getScopedCompanyId(user: AuthenticatedUser): string {
    const companyId = getCompanyScope(user);
    if (!companyId) {
      throw new BadRequestException(
        'Este endpoint requiere una empresa activa. Usá los endpoints globales de super admin.',
      );
    }

    return companyId;
  }

  private async ensureUsernameAvailable(
    username: string,
    excludedUserId?: number,
    repo: Repository<AdminUser> = this.usersRepo,
  ) {
    const existing = await repo.findOneBy({ username });

    if (existing && existing.id !== excludedUserId) {
      throw new ConflictException(`El nombre de usuario ${username} ya está en uso`);
    }
  }

  private async findCompanyEmployee(companyId: string, employeeId: string): Promise<Employee> {
    const employee = await this.employeesRepo.findOne({
      where: { id: employeeId, companyId },
      relations: {
        userAccount: {
          memberships: true,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(
        `El empleado ${employeeId} no pertenece a la empresa seleccionada`,
      );
    }

    return employee;
  }

  async findAll() {
    const companies = await this.companiesRepo.find({
      order: {
        razonSocial: 'ASC',
        createdAt: 'ASC',
      },
    });

    return companies.map((company) => this.toCompany(company));
  }

  async findOne(id: string) {
    const company = await this.findCompanyEntity(id);
    return this.toCompany(company);
  }

  async create(dto: CreateCompanyDto) {
    const cuit = normalizeCuit(dto.cuit);
    const razonSocial = trimRequired(dto.razonSocial);
    const nombreFantasia = trimOptional(dto.nombreFantasia);

    await this.ensureCuitAvailable(cuit);

    const company = this.companiesRepo.create({
      cuit,
      razonSocial,
      nombreFantasia: nombreFantasia ?? null,
      isActive: dto.isActive ?? true,
      defaultEntryTime: dto.defaultEntryTime ?? null,
      defaultExitTime: dto.defaultExitTime ?? null,
    });

    return this.toCompany(await this.companiesRepo.save(company));
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.findCompanyEntity(id);

    if (dto.cuit !== undefined) {
      const cuit = normalizeCuit(dto.cuit);
      await this.ensureCuitAvailable(cuit, company.id);
      company.cuit = cuit;
    }

    if (dto.razonSocial !== undefined) {
      company.razonSocial = trimRequired(dto.razonSocial);
    }

    if (dto.nombreFantasia !== undefined) {
      company.nombreFantasia = trimOptional(dto.nombreFantasia) ?? null;
    }

    if (dto.isActive !== undefined) {
      company.isActive = dto.isActive;
    }
    if (dto.defaultEntryTime !== undefined) {
      company.defaultEntryTime = dto.defaultEntryTime;
    }
    if (dto.defaultExitTime !== undefined) {
      company.defaultExitTime = dto.defaultExitTime;
    }

    return this.toCompany(await this.companiesRepo.save(company));
  }

  async getScopedSettings(user: AuthenticatedUser) {
    const company = await this.findCompanyEntity(this.getScopedCompanyId(user));
    return this.toCompany(company);
  }

  async updateScopedSettings(user: AuthenticatedUser, dto: UpdateCompanySettingsDto) {
    const company = await this.ensureCompanyIsActive(this.getScopedCompanyId(user));

    if (dto.defaultEntryTime !== undefined) {
      company.defaultEntryTime = dto.defaultEntryTime;
    }
    if (dto.defaultExitTime !== undefined) {
      company.defaultExitTime = dto.defaultExitTime;
    }

    return this.toCompany(await this.companiesRepo.save(company));
  }

  async listScopedScheduleProfiles(user: AuthenticatedUser) {
    const companyId = this.getScopedCompanyId(user);
    const profiles = await this.scheduleProfilesRepo.find({
      where: { companyId },
      order: {
        name: 'ASC',
        createdAt: 'ASC',
      },
    });

    return profiles.map((profile) => this.toScheduleProfile(profile));
  }

  async createScopedScheduleProfile(
    user: AuthenticatedUser,
    dto: CreateScheduleProfileDto,
  ) {
    const company = await this.ensureCompanyIsActive(this.getScopedCompanyId(user));
    const profile = this.scheduleProfilesRepo.create({
      companyId: company.id,
      name: trimRequired(dto.name),
      entryTime: dto.entryTime,
      exitTime: dto.exitTime,
      summerEntryTime: dto.summerEntryTime ?? null,
      summerExitTime: dto.summerExitTime ?? null,
      summerStart: dto.summerStart ?? null,
      summerEnd: dto.summerEnd ?? null,
      winterEntryTime: dto.winterEntryTime ?? null,
      winterExitTime: dto.winterExitTime ?? null,
      winterStart: dto.winterStart ?? null,
      winterEnd: dto.winterEnd ?? null,
      lateToleranceMinutes: dto.lateToleranceMinutes ?? 0,
      earlyDepartureToleranceMinutes: dto.earlyDepartureToleranceMinutes ?? 0,
      expectedMinutesPerDay: dto.expectedMinutesPerDay ?? null,
      workDays: dto.workDays ?? null,
      breakMinutes: dto.breakMinutes ?? 0,
      overtimeAfterMinutes: dto.overtimeAfterMinutes ?? 0,
    });

    try {
      return this.toScheduleProfile(await this.scheduleProfilesRepo.save(profile));
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un perfil horario con ese nombre.');
      }
      throw error;
    }
  }

  async updateScopedScheduleProfile(
    user: AuthenticatedUser,
    profileId: string,
    dto: UpdateScheduleProfileDto,
  ) {
    const companyId = this.getScopedCompanyId(user);
    const profile = await this.scheduleProfilesRepo.findOneBy({ id: profileId, companyId });
    if (!profile) {
      throw new NotFoundException('Perfil horario no encontrado');
    }

    if (dto.name !== undefined) profile.name = trimRequired(dto.name);
    if (dto.entryTime !== undefined) profile.entryTime = dto.entryTime;
    if (dto.exitTime !== undefined) profile.exitTime = dto.exitTime;
    if (dto.summerEntryTime !== undefined) profile.summerEntryTime = dto.summerEntryTime;
    if (dto.summerExitTime !== undefined) profile.summerExitTime = dto.summerExitTime;
    if (dto.summerStart !== undefined) profile.summerStart = dto.summerStart;
    if (dto.summerEnd !== undefined) profile.summerEnd = dto.summerEnd;
    if (dto.winterEntryTime !== undefined) profile.winterEntryTime = dto.winterEntryTime;
    if (dto.winterExitTime !== undefined) profile.winterExitTime = dto.winterExitTime;
    if (dto.winterStart !== undefined) profile.winterStart = dto.winterStart;
    if (dto.winterEnd !== undefined) profile.winterEnd = dto.winterEnd;
    if (dto.lateToleranceMinutes !== undefined) profile.lateToleranceMinutes = dto.lateToleranceMinutes;
    if (dto.earlyDepartureToleranceMinutes !== undefined) {
      profile.earlyDepartureToleranceMinutes = dto.earlyDepartureToleranceMinutes;
    }
    if (dto.expectedMinutesPerDay !== undefined) profile.expectedMinutesPerDay = dto.expectedMinutesPerDay;
    if (dto.workDays !== undefined) profile.workDays = dto.workDays;
    if (dto.breakMinutes !== undefined) profile.breakMinutes = dto.breakMinutes;
    if (dto.overtimeAfterMinutes !== undefined) profile.overtimeAfterMinutes = dto.overtimeAfterMinutes;

    try {
      return this.toScheduleProfile(await this.scheduleProfilesRepo.save(profile));
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un perfil horario con ese nombre.');
      }
      throw error;
    }
  }

  async removeScopedScheduleProfile(user: AuthenticatedUser, profileId: string) {
    const companyId = this.getScopedCompanyId(user);
    const profile = await this.scheduleProfilesRepo.findOne({
      where: { id: profileId, companyId },
      relations: {
        employees: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil horario no encontrado');
    }

    if ((profile.employees?.length ?? 0) > 0) {
      throw new ConflictException(
        'No se puede eliminar el perfil porque tiene empleados asignados.',
      );
    }

    await this.scheduleProfilesRepo.remove(profile);
    return { success: true as const };
  }

  async remove(id: string) {
    const company = await this.findCompanyEntity(id);
    const employeesCount = await this.employeesRepo.countBy({ companyId: company.id });
    if (employeesCount > 0) {
      throw new ConflictException(
        'No se puede eliminar la empresa porque todavía tiene empleados asociados',
      );
    }

    const usersCount = await this.membershipsRepo.countBy({ companyId: company.id });
    if (usersCount > 0) {
      throw new ConflictException(
        'No se puede eliminar la empresa porque todavía tiene usuarios con acceso asociados',
      );
    }

    await this.companiesRepo.remove(company);
    return { success: true as const };
  }

  async listEmployees(companyId: string) {
    await this.findCompanyEntity(companyId);

    const employees = await this.employeesRepo.find({
      where: { companyId },
      relations: {
        userAccount: {
          memberships: true,
        },
      },
      order: {
        apellido: 'ASC',
        nombre: 'ASC',
        id: 'ASC',
      },
    });

    return employees.map((employee) => this.toEmployee(employee));
  }

  async listEligibleEmployees(companyId: string) {
    await this.findCompanyEntity(companyId);

    const employees = await this.employeesRepo.find({
      where: { companyId },
      relations: {
        userAccount: {
          memberships: true,
        },
      },
      order: {
        apellido: 'ASC',
        nombre: 'ASC',
        id: 'ASC',
      },
    });

    return employees
      .filter((employee) => {
        const roleForCompany = employee.userAccount?.memberships?.find(
          (membership) => membership.companyId === companyId,
        );
        return !roleForCompany;
      })
      .map((employee) => this.toEmployee(employee));
  }

  async listScopedCompanyUsers(user: AuthenticatedUser) {
    return this.listCompanyUsers(this.getScopedCompanyId(user));
  }

  async listScopedEligibleEmployees(user: AuthenticatedUser) {
    return this.listEligibleEmployees(this.getScopedCompanyId(user));
  }

  async assignScopedCompanyUser(user: AuthenticatedUser, dto: AssignCompanyUserDto) {
    return this.assignCompanyUser(this.getScopedCompanyId(user), dto);
  }

  async updateScopedCompanyUser(
    user: AuthenticatedUser,
    userId: number,
    dto: UpdateCompanyUserDto,
  ) {
    return this.updateCompanyUser(this.getScopedCompanyId(user), userId, dto);
  }

  async removeScopedCompanyUser(user: AuthenticatedUser, userId: number) {
    return this.removeCompanyUser(this.getScopedCompanyId(user), userId);
  }

  async assignEmployee(companyId: string, employeeId: string) {
    await this.ensureCompanyIsActive(companyId);

    const employee = await this.employeesRepo.findOne({
      where: { id: employeeId },
      relations: {
        userAccount: {
          memberships: true,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Empleado ${employeeId} no encontrado`);
    }

    const foreignMembership = employee.userAccount?.memberships?.find(
      (membership) => membership.companyId !== companyId,
    );

    if (foreignMembership) {
      throw new ConflictException(
        'El empleado tiene acceso asignado a otra empresa. Remové ese acceso antes de moverlo.',
      );
    }

    employee.companyId = companyId;
    return this.toEmployee(await this.employeesRepo.save(employee));
  }

  async removeEmployee(companyId: string, employeeId: string) {
    const employee = await this.findCompanyEmployee(companyId, employeeId);

    const activeMembership = employee.userAccount?.memberships?.find(
      (membership) => membership.companyId === companyId,
    );

    if (activeMembership) {
      throw new ConflictException(
        'No se puede desasociar al empleado mientras tenga acceso activo a la empresa',
      );
    }

    employee.companyId = null;
    return this.toEmployee(await this.employeesRepo.save(employee));
  }

  async listCompanyUsers(companyId: string) {
    await this.findCompanyEntity(companyId);

    const memberships = await this.membershipsRepo.find({
      where: { companyId },
      relations: {
        user: {
          employee: true,
        },
      },
    });

    return memberships
      .sort((left, right) => {
        const leftApellido = left.user?.employee?.apellido ?? '';
        const rightApellido = right.user?.employee?.apellido ?? '';
        const byApellido = leftApellido.localeCompare(rightApellido, 'es', { sensitivity: 'base' });
        if (byApellido !== 0) return byApellido;

        const leftNombre = left.user?.employee?.nombre ?? '';
        const rightNombre = right.user?.employee?.nombre ?? '';
        return leftNombre.localeCompare(rightNombre, 'es', { sensitivity: 'base' });
      })
      .map((membership) => this.toCompanyUser(membership));
  }

  async assignCompanyUser(companyId: string, dto: AssignCompanyUserDto) {
    await this.ensureCompanyIsActive(companyId);
    const employee = await this.findCompanyEmployee(companyId, dto.employeeId);
    const foreignMembership = employee.userAccount?.memberships?.find(
      (membership) => membership.companyId !== companyId,
    );

    if (foreignMembership) {
      throw new ConflictException(
        'El empleado ya tiene acceso asociado a otra empresa. Remové esa asignación antes de continuar.',
      );
    }

    const username = dto.username?.trim();
    const password = dto.password;

    return this.companiesRepo.manager.transaction(async (manager) => {
      const usersRepo = manager.getRepository(AdminUser);
      const membershipsRepo = manager.getRepository(CompanyMembership);

      let user = await usersRepo.findOne({
        where: { employeeId: employee.id },
      });

      if (!user) {
        if (!username || !password) {
          throw new BadRequestException(
            'Para otorgar acceso por primera vez debés indicar username y password',
          );
        }

        await this.ensureUsernameAvailable(username, undefined, usersRepo);

        user = usersRepo.create({
          username,
          passwordHash: await bcrypt.hash(password, 10),
          nombre: employee.nombre,
          apellido: employee.apellido,
          dni: employee.id,
          telefono: employee.telefono,
          email: employee.email,
          isSuperAdmin: false,
          employeeId: employee.id,
        });

        user = await usersRepo.save(user);
      } else {
        if (username && username !== user.username) {
          await this.ensureUsernameAvailable(username, user.id, usersRepo);
          user.username = username;
        }

        if (password) {
          user.passwordHash = await bcrypt.hash(password, 10);
        }

        user.employeeId = employee.id;

        if (username || password) {
          user = await usersRepo.save(user);
        }
      }

      let membership = await membershipsRepo.findOne({
        where: {
          companyId,
          adminUserId: user.id,
        },
      });

      if (!membership) {
        membership = membershipsRepo.create({
          companyId,
          adminUserId: user.id,
          role: dto.role,
        });
      } else {
        membership.role = dto.role;
      }

      await membershipsRepo.save(membership);

      const savedMembership = await membershipsRepo.findOne({
        where: { id: membership.id },
        relations: {
          user: {
            employee: true,
          },
        },
      });

      if (!savedMembership) {
        throw new NotFoundException('No se pudo recuperar la asignación creada');
      }

      return this.toCompanyUser(savedMembership);
    });
  }

  async updateCompanyUser(companyId: string, userId: number, dto: UpdateCompanyUserDto) {
    await this.findCompanyEntity(companyId);

    const username = dto.username?.trim();
    const password = dto.password;

    return this.companiesRepo.manager.transaction(async (manager) => {
      const usersRepo = manager.getRepository(AdminUser);
      const membershipsRepo = manager.getRepository(CompanyMembership);

      const membership = await membershipsRepo.findOne({
        where: {
          companyId,
          adminUserId: userId,
        },
        relations: {
          user: {
            employee: true,
          },
        },
      });

      if (!membership || !membership.user) {
        throw new NotFoundException('Usuario de empresa no encontrado');
      }

      if (dto.role !== undefined) {
        membership.role = dto.role;
      }

      if (username && username !== membership.user.username) {
        await this.ensureUsernameAvailable(username, membership.user.id, usersRepo);
        membership.user.username = username;
      }

      if (password) {
        membership.user.passwordHash = await bcrypt.hash(password, 10);
      }

      await usersRepo.save(membership.user);
      await membershipsRepo.save(membership);

      const savedMembership = await membershipsRepo.findOne({
        where: { id: membership.id },
        relations: {
          user: {
            employee: true,
          },
        },
      });

      if (!savedMembership) {
        throw new NotFoundException('No se pudo recuperar la asignación actualizada');
      }

      return this.toCompanyUser(savedMembership);
    });
  }

  async removeCompanyUser(companyId: string, userId: number) {
    await this.findCompanyEntity(companyId);

    return this.companiesRepo.manager.transaction(async (manager) => {
      const usersRepo = manager.getRepository(AdminUser);
      const membershipsRepo = manager.getRepository(CompanyMembership);

      const membership = await membershipsRepo.findOne({
        where: {
          companyId,
          adminUserId: userId,
        },
      });

      if (!membership) {
        throw new NotFoundException('Asignación de usuario no encontrada');
      }

      await membershipsRepo.remove(membership);

      const remainingMemberships = await membershipsRepo.countBy({ adminUserId: userId });
      const user = await usersRepo.findOneBy({ id: userId });

      if (user && remainingMemberships === 0 && !user.isSuperAdmin) {
        await usersRepo.remove(user);
      }

      return { success: true as const };
    });
  }
}

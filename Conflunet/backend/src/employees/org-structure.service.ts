import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { Department } from './department.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { CreatePositionDto, UpdatePositionDto } from './dto/position.dto';
import { Position } from './position.entity';

type Catalog = 'departamento' | 'puesto';

@Injectable()
export class OrgStructureService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentsRepo: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionsRepo: Repository<Position>,
  ) {}

  listDepartments(companyId: string | undefined, user: AuthenticatedUser) {
    return this.departmentsRepo.find({
      where: { companyId: this.resolveReadableCompanyId(companyId, user, 'departamentos') },
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  listPositions(companyId: string | undefined, user: AuthenticatedUser) {
    return this.positionsRepo.find({
      where: { companyId: this.resolveReadableCompanyId(companyId, user, 'puestos') },
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  async createDepartment(dto: CreateDepartmentDto, user: AuthenticatedUser) {
    const companyId = this.resolveWritableCompanyId(dto.companyId, user, 'departamento');
    const department = this.departmentsRepo.create({
      companyId,
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.departmentsRepo.save(department);
  }

  async createPosition(dto: CreatePositionDto, user: AuthenticatedUser) {
    const companyId = this.resolveWritableCompanyId(dto.companyId, user, 'puesto');
    const position = this.positionsRepo.create({
      companyId,
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.positionsRepo.save(position);
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto, user: AuthenticatedUser) {
    const department = await this.findScopedDepartment(id, user);
    if (dto.name !== undefined) department.name = dto.name;
    if (dto.description !== undefined) department.description = dto.description;
    if (dto.isActive !== undefined) department.isActive = dto.isActive;
    return this.departmentsRepo.save(department);
  }

  async updatePosition(id: string, dto: UpdatePositionDto, user: AuthenticatedUser) {
    const position = await this.findScopedPosition(id, user);
    if (dto.name !== undefined) position.name = dto.name;
    if (dto.description !== undefined) position.description = dto.description;
    if (dto.isActive !== undefined) position.isActive = dto.isActive;
    return this.positionsRepo.save(position);
  }

  async deactivateDepartment(id: string, user: AuthenticatedUser) {
    const department = await this.findScopedDepartment(id, user);
    department.isActive = false;
    return this.departmentsRepo.save(department);
  }

  async deactivatePosition(id: string, user: AuthenticatedUser) {
    const position = await this.findScopedPosition(id, user);
    position.isActive = false;
    return this.positionsRepo.save(position);
  }

  private async findScopedDepartment(id: string, user: AuthenticatedUser): Promise<Department> {
    const department = user.isSuperAdmin
      ? await this.departmentsRepo.findOne({ where: { id } })
      : await this.departmentsRepo.findOne({ where: { id, companyId: getCompanyScope(user)! } });
    if (!department) throw new NotFoundException('Departamento no encontrado.');
    return department;
  }

  private async findScopedPosition(id: string, user: AuthenticatedUser): Promise<Position> {
    const position = user.isSuperAdmin
      ? await this.positionsRepo.findOne({ where: { id } })
      : await this.positionsRepo.findOne({ where: { id, companyId: getCompanyScope(user)! } });
    if (!position) throw new NotFoundException('Puesto no encontrado.');
    return position;
  }

  private resolveReadableCompanyId(
    requestedCompanyId: string | undefined,
    user: AuthenticatedUser,
    label: string,
  ): string {
    if (user.isSuperAdmin) {
      if (!requestedCompanyId) {
        throw new BadRequestException(
          `Para consultar ${label} como super admin, seleccioná una empresa.`,
        );
      }
      return requestedCompanyId;
    }

    if (requestedCompanyId !== undefined && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No podés consultar datos de otra empresa.');
    }
    return getCompanyScope(user)!;
  }

  private resolveWritableCompanyId(
    requestedCompanyId: string | null | undefined,
    user: AuthenticatedUser,
    label: Catalog,
  ): string {
    if (user.isSuperAdmin) {
      if (!requestedCompanyId) {
        throw new BadRequestException(
          `Para crear un ${label} como super admin, seleccioná una empresa.`,
        );
      }
      return requestedCompanyId;
    }

    const companyId = getCompanyScope(user)!;
    if (requestedCompanyId !== undefined && requestedCompanyId !== companyId) {
      throw new ForbiddenException('No podés administrar datos de otra empresa.');
    }
    return companyId;
  }
}

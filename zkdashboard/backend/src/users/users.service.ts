import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './admin-user.entity';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompanyMembership } from '../companies/company-membership.entity';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repo: Repository<AdminUser>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.repo.count();
    if (count === 0) {
      const username = this.config.get('ADMIN_USERNAME', 'admin');
      const password = this.config.get('ADMIN_PASSWORD', 'admin1234');
      const passwordHash = await bcrypt.hash(password, 10);
      await this.repo.save({
        username,
        passwordHash,
        nombre: null,
        apellido: null,
        dni: null,
        telefono: null,
        email: null,
        isSuperAdmin: true,
        employeeId: null,
      });
      console.log(`✓ Admin creado: usuario="${username}" — cambiá la contraseña en producción`);
    }
  }

  findByUsername(username: string): Promise<AdminUser | null> {
    return this.repo.findOne({
      where: { username },
      relations: {
        employee: true,
        memberships: {
          company: true,
        },
      },
    });
  }

  findById(id: number): Promise<AdminUser | null> {
    return this.repo.findOne({
      where: { id },
      relations: {
        employee: true,
        memberships: {
          company: true,
        },
      },
    });
  }

  buildAuthenticatedUser(user: AdminUser): AuthenticatedUser {
    const memberships = [...(user.memberships ?? [])].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    );
    const activeMembership = this.getActiveMembership(user, memberships);

    return {
      id: user.id,
      username: user.username,
      isSuperAdmin: user.isSuperAdmin,
      employeeId: user.employeeId,
      companyId: activeMembership?.companyId ?? null,
      companyRole: activeMembership?.role ?? null,
      memberships: memberships.map((membership) => ({
        companyId: membership.companyId,
        role: membership.role,
        company: membership.company
          ? {
              id: membership.company.id,
              cuit: membership.company.cuit,
              razonSocial: membership.company.razonSocial,
              nombreFantasia: membership.company.nombreFantasia,
              isActive: membership.company.isActive,
            }
          : null,
      })),
    };
  }

  private getActiveMembership(
    user: AdminUser,
    memberships: CompanyMembership[],
  ): CompanyMembership | null {
    if (memberships.length === 0) {
      return null;
    }

    if (user.employeeId) {
      const employeeMembership = memberships.find(
        (membership) => membership.companyId === user.employee?.companyId,
      );
      if (employeeMembership) {
        return employeeMembership;
      }
    }

    return memberships[0] ?? null;
  }

  private toProfile(user: AdminUser) {
    const authUser = this.buildAuthenticatedUser(user);

    return {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      apellido: user.apellido,
      dni: user.dni,
      telefono: user.telefono,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      employeeId: user.employeeId,
      companyId: authUser.companyId,
      companyRole: authUser.companyRole,
      memberships: authUser.memberships,
      createdAt: user.createdAt,
    };
  }

  async getProfile(id: number) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toProfile(user);
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.nombre !== undefined) user.nombre = dto.nombre;
    if (dto.apellido !== undefined) user.apellido = dto.apellido;
    if (dto.dni !== undefined) user.dni = dto.dni;
    if (dto.telefono !== undefined) user.telefono = dto.telefono;
    if (dto.email !== undefined) user.email = dto.email;

    const updated = await this.repo.save(user);
    return this.toProfile(updated);
  }

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);

    return { success: true as const };
  }
}

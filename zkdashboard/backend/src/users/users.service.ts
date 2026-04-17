import { Injectable, NotFoundException, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './admin-user.entity';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

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
      const password = this.config.get('ADMIN_PASSWORD', 'admin123');
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
    return this.repo.findOneBy({ username });
  }

  findById(id: number): Promise<AdminUser | null> {
    return this.repo.findOneBy({ id });
  }

  private toProfile(user: AdminUser) {
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

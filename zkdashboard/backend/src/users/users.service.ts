import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './admin-user.entity';

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
      await this.repo.save({ username, passwordHash });
      console.log(`✓ Admin creado: usuario="${username}" — cambiá la contraseña en producción`);
    }
  }

  findByUsername(username: string): Promise<AdminUser | null> {
    return this.repo.findOneBy({ username });
  }
}

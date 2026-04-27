import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const authUser = this.users.buildAuthenticatedUser(user);
    if (!authUser.isSuperAdmin && !authUser.companyId) {
      throw new UnauthorizedException(
        'El usuario no tiene una empresa activa asignada.',
      );
    }

    const payload = {
      sub: authUser.id,
      username: authUser.username,
      isSuperAdmin: authUser.isSuperAdmin,
      employeeId: authUser.employeeId,
      companyId: authUser.companyId,
      companyRole: authUser.companyRole,
      memberships: authUser.memberships.map((membership) => ({
        companyId: membership.companyId,
        role: membership.role,
      })),
    };

    return { access_token: this.jwt.sign(payload) };
  }
}

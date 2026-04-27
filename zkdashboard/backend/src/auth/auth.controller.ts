import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './auth.guard';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthenticatedUser } from './authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.users.getProfile(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(req.user.id, dto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}

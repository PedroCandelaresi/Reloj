import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { AssignCompanyUserDto } from './dto/assign-company-user.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompaniesService } from './companies.service';

@Controller('company')
@UseGuards(JwtAuthGuard, CompanyAdminGuard)
export class CompanyUsersController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('users')
  listUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.companies.listScopedCompanyUsers(user);
  }

  @Get('eligible-employees')
  listEligibleEmployees(@CurrentUser() user: AuthenticatedUser) {
    return this.companies.listScopedEligibleEmployees(user);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.companies.getScopedSettings(user);
  }

  @Put('settings')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    return this.companies.updateScopedSettings(user, dto);
  }

  @Post('users')
  createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignCompanyUserDto,
  ) {
    return this.companies.assignScopedCompanyUser(user, dto);
  }

  @Put('users/:userId')
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateCompanyUserDto,
  ) {
    return this.companies.updateScopedCompanyUser(user, userId, dto);
  }

  @Delete('users/:userId')
  removeUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.companies.removeScopedCompanyUser(user, userId);
  }
}

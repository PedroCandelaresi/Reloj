import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AssignCompanyUserDto } from './dto/assign-company-user.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompaniesService } from './companies.service';

@Controller('admin/companies')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  findAll() {
    return this.companies.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.remove(id);
  }

  @Get(':id/employees')
  listEmployees(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.listEmployees(id);
  }

  @Get(':id/eligible-employees')
  listEligibleEmployees(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.listEligibleEmployees(id);
  }

  @Put(':id/employees/:employeeId')
  assignEmployee(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.companies.assignEmployee(id, employeeId);
  }

  @Delete(':id/employees/:employeeId')
  removeEmployee(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.companies.removeEmployee(id, employeeId);
  }

  @Get(':id/users')
  listCompanyUsers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.listCompanyUsers(id);
  }

  @Post(':id/users')
  assignCompanyUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignCompanyUserDto,
  ) {
    return this.companies.assignCompanyUser(id, dto);
  }

  @Put(':id/users/:userId')
  updateCompanyUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateCompanyUserDto,
  ) {
    return this.companies.updateCompanyUser(id, userId, dto);
  }

  @Delete(':id/users/:userId')
  removeCompanyUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.companies.removeCompanyUser(id, userId);
  }
}

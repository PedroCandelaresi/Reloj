import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.findOne(id, user);
  }

  @Post()
  @UseGuards(CompanyAdminGuard)
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.create(dto, user);
  }

  @Put(':id')
  @UseGuards(CompanyAdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(CompanyAdminGuard)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.remove(id, user);
  }
}

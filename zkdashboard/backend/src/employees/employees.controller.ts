import {
  BadRequestException,
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

  @Post('device-sync/:deviceId/import')
  @UseGuards(CompanyAdminGuard)
  importFromDevice(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.requestImportFromDevice(deviceId, user);
  }

  @Post('device-sync/:deviceId/export')
  @UseGuards(CompanyAdminGuard)
  exportAllToDevice() {
    throw new BadRequestException(
      'La sincronización masiva está deshabilitada. Enviá empleados individuales al reloj.',
    );
  }

  @Post('device-sync/:deviceId/export/:employeeId')
  @UseGuards(CompanyAdminGuard)
  exportEmployeeToDevice(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.requestExportEmployeeToDevice(deviceId, employeeId, user);
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

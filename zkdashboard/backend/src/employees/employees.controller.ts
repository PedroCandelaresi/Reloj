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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { TimeBankAdjustmentDto } from './dto/time-bank-adjustment.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive') includeInactive?: string,
    @Query('departmentId') departmentId?: string,
    @Query('positionId') positionId?: string,
  ) {
    return this.employees.findAll(user, { includeInactive, departmentId, positionId });
  }

  // Accesible a todos los roles autenticados (incluye read_only) porque el banco de horas
  // es información de consulta/auditoría. El scope de empresa está protegido por findOne.
  // Solo company_admin y super_admin pueden crear ajustes (ver endpoint POST de abajo).
  @Get(':id/time-bank')
  getTimeBank(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.employees.getTimeBank(id, user, dateFrom, dateTo);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.findOne(id, user);
  }

  @Post('import/preview')
  @UseGuards(CompanyAdminGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  previewImport(
    @UploadedFile() file: any,
    @Body('companyId') companyId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.previewImport(file, user, companyId);
  }

  @Post('import/confirm')
  @UseGuards(CompanyAdminGuard)
  confirmImport(
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.confirmImport(body, user);
  }

  @Post()
  @UseGuards(CompanyAdminGuard)
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.create(dto, user);
  }

  @Post(':id/time-bank/adjustments')
  @UseGuards(CompanyAdminGuard)
  createTimeBankAdjustment(
    @Param('id') id: string,
    @Body() dto: TimeBankAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.createTimeBankAdjustment(id, dto, user);
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

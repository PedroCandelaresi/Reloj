import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { DevicesModule } from '../devices/devices.module';
import { Department } from './department.entity';
import { Employee } from './employee.entity';
import { AdminModule } from '../admin/admin.module';
import { EmployeeTimeBankLedger } from './employee-time-bank-ledger.entity';
import { Position } from './position.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { DepartmentsController } from './departments.controller';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { OrgStructureService } from './org-structure.service';
import { PositionsController } from './positions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Department,
      Position,
      ScheduleProfile,
      EmployeeTimeBankLedger,
    ]),
    DevicesModule,
    AdminModule,
  ],
  providers: [EmployeesService, OrgStructureService, CompanyAdminGuard],
  controllers: [EmployeesController, DepartmentsController, PositionsController],
  exports: [EmployeesService],
})
export class EmployeesModule {}

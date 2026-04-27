import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { Employee } from './employee.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee])],
  providers: [EmployeesService, CompanyAdminGuard],
  controllers: [EmployeesController],
  exports: [EmployeesService],
})
export class EmployeesModule {}

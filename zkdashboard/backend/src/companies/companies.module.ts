import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from '../users/admin-user.entity';
import { Employee } from '../employees/employee.entity';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CompanyMembership } from './company-membership.entity';
import { Company } from './company.entity';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { IsCuitConstraint } from './validation/cuit.validator';

@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyMembership, AdminUser, Employee])],
  providers: [CompaniesService, IsCuitConstraint, SuperAdminGuard],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}

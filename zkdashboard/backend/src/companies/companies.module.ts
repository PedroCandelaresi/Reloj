import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from '../users/admin-user.entity';
import { Employee } from '../employees/employee.entity';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CompanyMembership } from './company-membership.entity';
import { Company } from './company.entity';
import { ScheduleProfileDayInterval } from './schedule-profile-day-interval.entity';
import { ScheduleProfileDayRule } from './schedule-profile-day-rule.entity';
import { ScheduleProfile } from './schedule-profile.entity';
import { CompaniesController } from './companies.controller';
import { CompanyUsersController } from './company-users.controller';
import { CompaniesService } from './companies.service';
import { IsCuitConstraint } from './validation/cuit.validator';

@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyMembership, ScheduleProfile, ScheduleProfileDayRule, ScheduleProfileDayInterval, AdminUser, Employee])],
  providers: [CompaniesService, IsCuitConstraint, SuperAdminGuard],
  controllers: [CompaniesController, CompanyUsersController],
  exports: [CompaniesService],
})
export class CompaniesModule {}

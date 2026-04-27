import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboundRequest } from '../adms/inbound-request.entity';
import { AttendanceRecord } from '../attendance/attendance.entity';
import { CompanyMembership } from '../companies/company-membership.entity';
import { Company } from '../companies/company.entity';
import { DeviceCommand } from '../devices/device-command.entity';
import { Device } from '../devices/device.entity';
import { Employee } from '../employees/employee.entity';
import { AdminUser } from '../users/admin-user.entity';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      AttendanceRecord,
      Company,
      CompanyMembership,
      Device,
      DeviceCommand,
      Employee,
      InboundRequest,
    ]),
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, SuperAdminGuard],
})
export class AdminDashboardModule {}

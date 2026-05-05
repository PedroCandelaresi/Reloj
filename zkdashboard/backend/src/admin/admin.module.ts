import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { AdminAuditService } from './admin-audit.service';
import { AttendanceRecalculationLog } from './entities/attendance-recalculation-log.entity';
import { AdminConfigAuditLog } from './entities/admin-config-audit-log.entity';
import { Device } from '../devices/device.entity';
import { DeviceCommand } from '../devices/device-command.entity';
import { Company } from '../companies/company.entity';
import { InboundRequest } from '../adms/inbound-request.entity';
import { Employee } from '../employees/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecalculationLog,
      AdminConfigAuditLog,
      Device,
      DeviceCommand,
      Company,
      InboundRequest,
      Employee,
    ]),
  ],
  controllers: [SupportController],
  providers: [SupportService, AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminModule {}

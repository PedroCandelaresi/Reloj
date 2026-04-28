import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { CompanyOperatorGuard } from '../auth/guards/company-operator.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Company } from '../companies/company.entity';
import { Employee } from '../employees/employee.entity';
import { Device } from './device.entity';
import { DeviceCommand } from './device-command.entity';
import { DeviceUserSnapshot } from './device-user-snapshot.entity';
import { DevicesService } from './devices.service';
import { AdminDevicesController } from './admin-devices.controller';
import { DevicesController } from './devices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Device, DeviceCommand, DeviceUserSnapshot, Company, Employee])],
  controllers: [DevicesController, AdminDevicesController],
  providers: [DevicesService, SuperAdminGuard, CompanyAdminGuard, CompanyOperatorGuard],
  exports: [DevicesService],
})
export class DevicesModule {}

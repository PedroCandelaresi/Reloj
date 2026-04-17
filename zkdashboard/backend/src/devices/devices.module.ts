import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Company } from '../companies/company.entity';
import { Device } from './device.entity';
import { DeviceCommand } from './device-command.entity';
import { DevicesService } from './devices.service';
import { AdminDevicesController } from './admin-devices.controller';
import { DevicesController } from './devices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Device, DeviceCommand, Company])],
  controllers: [DevicesController, AdminDevicesController],
  providers: [DevicesService, SuperAdminGuard],
  exports: [DevicesService],
})
export class DevicesModule {}

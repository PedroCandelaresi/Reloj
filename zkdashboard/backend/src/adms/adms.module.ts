import { Module } from '@nestjs/common';
import { AdmsController } from './adms.controller';
import { AdmsService } from './adms.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [AttendanceModule, DevicesModule],
  controllers: [AdmsController],
  providers: [AdmsService],
})
export class AdmsModule {}

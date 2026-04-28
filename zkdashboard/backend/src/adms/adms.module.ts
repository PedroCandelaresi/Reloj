import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmsController } from './adms.controller';
import { AdmsService } from './adms.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { DevicesModule } from '../devices/devices.module';
import { InboundRequest } from './inbound-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InboundRequest]), AttendanceModule, DevicesModule],
  controllers: [AdmsController],
  providers: [AdmsService],
})
export class AdmsModule {}

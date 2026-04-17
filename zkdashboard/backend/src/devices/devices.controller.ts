import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DevicesService } from './devices.service';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  findAll() {
    return this.devices.findAll();
  }

  @Post(':id/force-sync')
  async forceSync(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { username?: string } },
  ) {
    const result = await this.devices.enqueueAttendanceSync(id, req.user?.username);

    return {
      ok: true,
      duplicate: result.duplicate,
      message: result.duplicate
        ? `Ya había una sincronización pendiente para el dispositivo ${result.device.serialNumber}.`
        : `Sincronización encolada para el dispositivo ${result.device.serialNumber}. El reloj la retirará en el próximo heartbeat.`,
      device: result.device,
      command: result.command,
    };
  }
}

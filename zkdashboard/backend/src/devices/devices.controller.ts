import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompanyOperatorGuard } from '../auth/guards/company-operator.guard';
import { DevicesService } from './devices.service';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.devices.findAllForUser(user);
  }

  @Post(':id/force-sync')
  @UseGuards(CompanyOperatorGuard)
  async forceSync(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.devices.enqueueAttendanceSync(id, user.username, user);

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

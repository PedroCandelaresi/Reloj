import {
  Body,
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

  @Get(':id/commands')
  findCommands(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.findCommandsForDevice(id, user);
  }

  @Post(':id/commands/check-time')
  @UseGuards(CompanyOperatorGuard)
  enqueueCheckTime(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.enqueueCommand(id, 'check', user.username, user);
  }

  @Post(':id/commands/set-time')
  @UseGuards(CompanyOperatorGuard)
  enqueueSetTime(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.enqueueCommand(id, 'set_time', user.username, user);
  }

  @Post(':id/commands/query-attlog')
  @UseGuards(CompanyOperatorGuard)
  enqueueQueryAttlog(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { startTime?: string; endTime?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.enqueueCommand(id, 'query_attlog', user.username, user, body ?? null);
  }

  @Post(':id/commands/reboot')
  @UseGuards(CompanyOperatorGuard)
  enqueueReboot(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.enqueueCommand(id, 'reboot', user.username, user);
  }

  @Post(':id/commands/retry-failed/:commandId')
  @UseGuards(CompanyOperatorGuard)
  retryFailedCommand(
    @Param('id', ParseIntPipe) id: number,
    @Param('commandId', ParseIntPipe) commandId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.retryCommand(id, commandId, user);
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

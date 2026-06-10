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
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
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

  @Get(':id/user-reconciliation')
  findUserReconciliation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.getUserReconciliation(id, user);
  }

  @Post(':id/query-users')
  @UseGuards(CompanyOperatorGuard)
  async queryUsers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.devices.enqueueUserInfoQuery(id, user);

    return {
      ok: true,
      device: {
        id: result.device.id,
        serialNumber: result.device.serialNumber,
      },
      commands: result.commands.map((command) => ({
        id: command.id,
        commandType: command.commandType,
        command: command.command,
        status: command.status,
      })),
      message: 'Consulta USERINFO encolada. El reloj responderá en el próximo heartbeat.',
    };
  }

  @Post(':id/employees/:employeeId/sync-user')
  @UseGuards(CompanyAdminGuard)
  async syncEmployeeUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.devices.enqueueEmployeeUserSync(id, employeeId, user);

    return {
      ok: true,
      device: {
        id: result.device.id,
        serialNumber: result.device.serialNumber,
      },
      command: {
        id: result.command.id,
        status: result.command.status,
      },
      message: `Empleado ${employeeId} encolado para enviar al reloj.`,
    };
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

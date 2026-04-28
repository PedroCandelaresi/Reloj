import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  AttendanceAuditLogQueryDto,
  AttendanceRequestsQueryDto,
  CreateAttendanceRequestDto,
  ReviewAttendanceRequestDto,
} from './dto/attendance-request.dto';
import { AttendanceRequestsService } from './attendance-requests.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceRequestsController {
  constructor(private readonly requests: AttendanceRequestsService) {}

  @Get('requests')
  findAll(
    @Query() query: AttendanceRequestsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.findAll(user, query);
  }

  @Post('requests')
  create(
    @Body() dto: CreateAttendanceRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.create(user, dto);
  }

  @Put('requests/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ReviewAttendanceRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.approve(user, id, dto);
  }

  @Put('requests/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewAttendanceRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.reject(user, id, dto);
  }

  @Put('requests/:id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.cancel(user, id);
  }

  @Get('audit-log')
  auditLog(
    @Query() query: AttendanceAuditLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.auditLog(user, query);
  }
}

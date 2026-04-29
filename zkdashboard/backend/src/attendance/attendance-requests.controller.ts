import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  AttendanceAuditLogQueryDto,
  AttendanceJustificationTypesQueryDto,
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

  @Get('justification-types')
  justificationTypes(
    @Query() query: AttendanceJustificationTypesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.listJustificationTypes(user, query);
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

  @Get('requests/:id/attachments')
  attachments(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.listAttachments(user, id);
  }

  @Post('requests/:id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.uploadAttachment(user, id, file);
  }

  @Get('requests/:id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const attachment = await this.requests.getAttachmentForDownload(user, id, attachmentId);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
    return res.sendFile(attachment.storagePath);
  }

  @Delete('requests/:id/attachments/:attachmentId')
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.deleteAttachment(user, id, attachmentId);
  }

  @Get('audit-log')
  auditLog(
    @Query() query: AttendanceAuditLogQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requests.auditLog(user, query);
  }
}

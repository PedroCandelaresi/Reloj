import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AssignDeviceCompanyDto } from './dto/assign-device-company.dto';
import { DevicesService } from './devices.service';

@Controller('admin/devices')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminDevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  findAll() {
    return this.devices.findAllForAdmin();
  }

  @Get('unassigned')
  findUnassigned() {
    return this.devices.findUnassignedForAdmin();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.devices.findOneForAdmin(id);
  }

  @Put(':id/company')
  assignCompany(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDeviceCompanyDto,
  ) {
    return this.devices.assignCompany(id, dto.companyId, dto.alias, dto.address, dto.email, dto.phone);
  }

  @Delete(':id/company')
  unassignCompany(@Param('id', ParseIntPipe) id: number) {
    return this.devices.unassignCompany(id);
  }
}

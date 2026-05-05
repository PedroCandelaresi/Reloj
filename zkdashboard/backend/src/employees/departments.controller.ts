import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { OrgStructureService } from './org-structure.service';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly orgStructure: OrgStructureService) {}

  @Get()
  list(@Query('companyId') companyId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.orgStructure.listDepartments(companyId, user);
  }

  @Post()
  @UseGuards(CompanyAdminGuard)
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orgStructure.createDepartment(dto, user);
  }

  @Put(':id')
  @UseGuards(CompanyAdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgStructure.updateDepartment(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(CompanyAdminGuard)
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orgStructure.deactivateDepartment(id, user);
  }
}

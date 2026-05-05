import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompanyAdminGuard } from '../auth/guards/company-admin.guard';
import { CreatePositionDto, UpdatePositionDto } from './dto/position.dto';
import { OrgStructureService } from './org-structure.service';

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionsController {
  constructor(private readonly orgStructure: OrgStructureService) {}

  @Get()
  list(@Query('companyId') companyId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.orgStructure.listPositions(companyId, user);
  }

  @Post()
  @UseGuards(CompanyAdminGuard)
  create(@Body() dto: CreatePositionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orgStructure.createPosition(dto, user);
  }

  @Put(':id')
  @UseGuards(CompanyAdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgStructure.updatePosition(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(CompanyAdminGuard)
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orgStructure.deactivatePosition(id, user);
  }
}

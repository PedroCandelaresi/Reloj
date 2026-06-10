import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CreateHolidayDto, HolidayQueryDto, UpdateHolidayDto } from './dto/holiday.dto';
import { HolidaysService } from './holidays.service';

@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: HolidayQueryDto) {
    return this.holidays.findAll(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHolidayDto) {
    return this.holidays.create(user, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.holidays.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.holidays.remove(user, id);
  }
}

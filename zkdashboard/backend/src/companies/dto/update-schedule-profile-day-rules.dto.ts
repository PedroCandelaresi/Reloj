import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ScheduleProfileDayRuleDto } from './schedule-profile-day-rule.dto';

export class UpdateScheduleProfileDayRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleProfileDayRuleDto)
  rules: ScheduleProfileDayRuleDto[];
}

import { PartialType } from '@nestjs/mapped-types';
import { CreateDashboardDto } from './create-dashboard.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDashboardDto extends PartialType(CreateDashboardDto) {
  @IsString()
  @IsOptional()
  _id?: string;
}

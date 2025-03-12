import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllUsersDto {
  @IsString()
  @IsOptional()
  query?: string; // Tìm kiếm theo name hoặc email

  @IsInt()
  @Min(1)
  @Type(() => Number) // Chuyển string thành number
  current: number = 1; // Trang hiện tại, mặc định là 1

  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize: number = 10; // Số bản ghi trên trang, mặc định là 10
}
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateUserDto  {
    @IsMongoId({message:"_id không hợp lệ"})
    @IsNotEmpty({message:"_id không được để trống"})
    _id: string;
    @IsOptional()
    name: string;
    @IsOptional()
    email: string;
    @IsOptional()
    password?: string;
    @IsOptional()
    phone?: string;
    @IsOptional()
    address?: string;
    @IsOptional()
    image?: string;
    @IsOptional()
    otpSecret?: string;
    @IsOptional()
    otp: string;
    @IsOptional()
    otpExpiresAt: Date;
    @IsOptional()
    providerId?: string;
    @IsOptional()
    accountType?: string;
    @IsOptional()
    isActive?: boolean;
}

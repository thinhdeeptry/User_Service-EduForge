import { Prop } from "@nestjs/mongoose";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateDashboardDto {
    @IsNotEmpty({ message: "email không được để trống" })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;
    @IsNotEmpty({ message: "password không được để trống" })
    password: string;
    @IsNotEmpty({ message: 'Tên không được để trống' })
    name: string;
    @IsOptional() // Cho phép trường này có thể bỏ trống
    @IsString()
    role?: string;
    @IsOptional() // Cho phép trường này có thể bỏ trống
    @IsString()
    isActive?: boolean;
    @IsOptional() // Cho phép trường này có thể bỏ trống
    @IsString()
    phone?: string;
    @IsOptional() // Cho phép trường này có thể bỏ trống
    @IsString()
    address?: string;
    @IsOptional() // Cho phép trường này có thể bỏ trống
    @IsString()
    image?: string;
}

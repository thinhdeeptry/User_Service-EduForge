import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @IsNotEmpty({message:'Tên không được để trống'})
    name: string;

    @IsNotEmpty()
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @IsNotEmpty({message:'Mật khẩu không được để trống'})
    password: string;

    @IsOptional() // Cho phép trường này có thể bỏ trống
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    image?: string;

    // codeId: string;

    // codeExpired: Date;
}

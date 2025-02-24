import { IsNotEmpty } from "class-validator";

export class CreateAuthDto {
    @IsNotEmpty({ message: "email không được để trống" })
    email: string;
    @IsNotEmpty({ message: "password không được để trống" })
    password: string;
    @IsNotEmpty({ message: 'Tên không được để trống' })
    name: string;
}

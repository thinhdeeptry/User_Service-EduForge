
import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePasswordHelper, hashPasswordHelper } from 'src/helpers/util';
import { UsersService } from 'src/modules/users/users.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { authenticator } from 'otplib';
import fs from 'fs';
import handlebars from 'handlebars';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    console.log(user);
    
    if (!user) {
      throw new UnauthorizedException("Email hoặc password không hợp lệ");
    }
    const isValidPassword = await comparePasswordHelper(pass, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException("Email hoặc password không hợp lệ");
    }

    return user;
    // const payload = { sub: user._id, username: user.email };
    // return {
    //   access_token: await this.jwtService.signAsync(payload),
    // };
  }

  async login(user: any) {
    const payload = { username: user.email, sub: user._id, role: user.role };
    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        phone: user.phone,
        address: user.adress,
        role: user.role,
        accountType: user.accountType,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  async handleRegister(register: CreateAuthDto) {
    const { name, email, password } = register;
    //check email
    const isEmailExit = await this.usersService.isEmailExit(email);
    if (isEmailExit) {
      throw new BadRequestException(`Email ${email} đã tồn tại, vui lòng sử dụng email khác!`);
    }
    //create user
    const user = await this.usersService.create({
      name, email, password
    });
    //generate Secret Key+ OTP
    //send email
    this.sendOTP(user._id.toString());
    return {
      _id: user._id
    };
  }
  // xử lý OTP
  private generateSecret(): string {
    return authenticator.generateSecret(32); // Secret key Base32 32 ký tự
  }

  // Tạo mã OTP sử dụng TOTP
  generateOTP(secret: string): string {
    authenticator.options = { digits: 6, step: 300 }; // 6 chữ số, hết hạn sau 5 phút
    return authenticator.generate(secret); // Tạo mã OTP
  }

  // Cập nhật OTP cho user
  async updateOTP(id: string): Promise<{ otp: string; expiresAt: Date }> {
    try {
      const user = await this.usersService.findBy_id(id);
      if (!user) throw new BadRequestException('User not found');
      let secret = user.otpSecret;
      if (secret == null) {
        secret = this.generateSecret();
      }
      // Tạo mã OTP mới
      const otp = this.generateOTP(secret);
      const expiresInMinutes = 5; // OTP hết hạn sau 5 phút
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Cập nhật OTP và thời gian hết hạn trong DB
      await this.usersService.updateOTP(user._id.toString(), secret, otp, expiresAt);

      // Trả về OTP và thời gian hết hạn để gửi qua email hoặc giao diện
      return { otp, expiresAt };
    } catch (error) {
      throw new InternalServerErrorException('Không thể cập nhật OTP. Vui lòng thử lại.');
    }
  }
  async sendOTP(id: string): Promise<void> {
    const { otp } = await this.updateOTP(id);
    const user = await this.usersService.findBy_id(id);
    try {
      const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
      const template = await fs.promises.readFile('src/mail/templates/register.hbs', 'utf8');
      const compiledTemplate = handlebars.compile(template);
      const html = compiledTemplate({
        name: user?.name ?? user?.email,
        activationCode: otp
      });
      const { data, error } = await resend.emails.send({
        from: 'EduForge<auth@eduforge.io.vn>',
        to: user?.email ? [user.email] : [],
        subject: 'Account Activation - EduForge',
        html: html
      });

      if (error) {
        console.error({ error });
        throw new InternalServerErrorException('Failed to send email');
      }

      console.log(`Send email success to ${user?.email}`);
    } catch (error) {
      console.error('Send email error:', error);
      throw new InternalServerErrorException('Không thể gửi mã OTP. Vui lòng thử lại.');
    }
  }

  async verifyOTP(id: string, otp: string): Promise<boolean> {
    const user = await this.usersService.findBy_id(id);
    if (!user || !user.otpSecret) throw new BadRequestException('OTP không hợp lệ hoặc user không tồn tại');

    authenticator.options = { digits: 6, step: 300 }; // Cấu hình lại để kiểm tra
    const isValid = authenticator.check(otp, user.otpSecret); // Kiểm tra mã OTP với secret
    if (!isValid) throw new BadRequestException('Mã OTP không hợp lệ');

    // Kiểm tra thời gian hết hạn
    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn');
    }

    // Kích hoạt tài khoản và xóa OTP sau khi xác thực
    await this.usersService.updateIsActive(user._id.toString(), true);
    await this.usersService.clearOTP(user._id.toString()); // Xóa secret và OTP sau khi xác thực
    return true;
  }
}

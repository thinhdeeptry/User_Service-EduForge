import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public } from '../decorator/customAnotation';
import { CreateAuthDto } from './dto/create-auth.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService
  ) { }

  @Post("login")
  @Public()
  @UseGuards(LocalAuthGuard)
  handleLogin(@Request() req) {
    console.log("req.user", req.user);

    return this.authService.login(req.user);
  }

  // @UseGuards(JwtAuthGuard)
  @Post('register')
  @Public()
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Post('mail')
  @Public()
  testMail() {
    this.mailerService
      .sendMail({
        to: 'thinhdz1500@gmail.com', // list of receivers
        subject: 'Testing Nest MailerModule ✔', // Subject line
        text: 'welcome', // plaintext body
        template: "register.hbs",
        context: {
          name: "abc",
          activationCode: 123456789
        }
      })
      .then(() => { })
      .catch(() => { });
    return "ok";
  }
  @Post('verify-otp')
  @Public()
  async verifyOTP(@Body() body: { email: string; otp: string }) {
    const { email, otp } = body;
    const isValid = await this.authService.verifyOTP(email, otp);
    if (isValid) {
      return { message: 'Xác thực OTP thành công. Tài khoản đã được kích hoạt.' };
    }
    throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
  }

  @Post('refresh-otp')
  @Public()
  async refreshOTP(@Body('email') email: string) {
    const { otp } = await this.authService.updateOTP(email);
    return { message: `Mã OTP mới đã được gửi: ${otp}. Vui lòng kiểm tra email.` };
  }
}

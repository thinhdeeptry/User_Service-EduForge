import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public } from '../decorator/customAnotation';
import { CreateAuthDto } from './dto/create-auth.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { Resend } from 'resend';
import { register } from 'module';
import * as fs from 'fs';
import handlebars from 'handlebars';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService
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
  // @Post('mail')
  // @Public()
  // async testMail() {
  //   const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  //   const template = await fs.promises.readFile('src/mail/templates/register.hbs', 'utf8');
  //   const compiledTemplate = handlebars.compile(template);
  //   const html = compiledTemplate({
  //     name: 'Test User',
  //     activationCode: '123456'
  //   });

  //   const { data, error } = await resend.emails.send({
  //     from: 'EduForce<auth@eduforge.io.vn>',
  //     to: ['thinhdz1500@gmail.com'],
  //     subject: 'Account Activation - EduForge',
  //     html: html
  //   });

  //   if (error) {
  //     console.error({ error });
  //     throw new InternalServerErrorException('Failed to send email');
  //   }

  //   console.log({ data });
  //   return { message: 'Email sent successfully' };
  // }
  @Post('verify-otp')
  @Public()
  async verifyOTP(@Body() body: { id: string; otp: string }) {
    const { id, otp } = body;
    if (!id || !otp) {
      throw new BadRequestException('Thiếu thông tin');
    }
    const isValid = await this.authService.verifyOTP(id, otp);
    if (isValid) {
      return { message: 'Xác thực OTP thành công. Tài khoản đã được kích hoạt.' };
    }
    throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
  }

  @Post('refresh-otp')
  @Public()
  async refreshOTP(@Body('id') id: string) {
     await this.authService.updateOTP(id);
    return { message: `Mã OTP mới đã được gửi. Vui lòng kiểm tra email.` };
  }
}

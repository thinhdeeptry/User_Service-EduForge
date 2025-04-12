import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, BadRequestException, InternalServerErrorException, Res, UnauthorizedException } from '@nestjs/common';
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
import { GoogleAuthGuard } from './passport/google-auth.guard';
import { FacebookAuthGuard } from './passport/facebook-auth.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService
  ) { }

  @Post("login")
  @Public()
  @UseGuards(LocalAuthGuard)
  async handleLogin(@Request() req, @Res({ passthrough: true }) res) {
    const authResult = await this.authService.login(req.user);
    // Set refreshToken in an HTTP-only cookie
    // res.cookie('refreshToken', authResult.refreshToken, {
    //   httpOnly: true,
    //   secure: false, // Đảm bảo là false khi chạy trên localhost
    //   // sameSite: 'lax',
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    //   path: '/', // Restrict cookie to auth routes
    //   // domain: 'localhost'
    // });

    // Return everything except the refreshToken
    // const { refreshToken, ...result } = authResult;
    return authResult;
  }

  // Endpoint lấy refresh token từ cookie
  @Get('token')
  @Public()
  async getRefreshToken(@Request() req, @Res({ passthrough: true }) res) {
    // Lấy refresh token từ cookie
    // const refreshToken = req.cookies?.refreshToken;

    console.log('Request cookies:', req.cookies);
    console.log('Request headers:', req.headers);

    const cookieToken = req.cookies?.refreshToken;
    const headerCookie = req.headers.cookie;

    console.log('Cookie token:', cookieToken);
    console.log('Header cookie string:', headerCookie);

    // Parse the cookie header manually if needed
    let parsedCookieToken = null;
    if (headerCookie && typeof headerCookie === 'string') {
      const cookies = headerCookie.split(';').map(cookie => cookie.trim());
      const refreshTokenCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));
      if (refreshTokenCookie) {
        // Ensure parsedCookieToken is explicitly typed as string | null
        console.log('Parsed cookie token:', refreshTokenCookie.split('=')[1]);
      }
    }

    // Use the token from any available source
    const refreshToken = cookieToken || parsedCookieToken || null;
    // Kiểm tra xem refresh token có tồn tại không
    if (!refreshToken) {
      throw new BadRequestException('Không tìm thấy refresh token');
    }

    try {
      // Gọi service để tạo access token mới từ refresh token
      const result = await this.authService.refreshToken(refreshToken);

      // Trả về access token mới
      return {
        accessToken: result.accessToken,
        message: 'Tạo access token mới thành công'
      };
    } catch (error) {
      // Xóa cookie refresh token nếu không hợp lệ
      res.clearCookie('refreshToken');
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  @Post('refresh')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
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

  // Google OAuth routes
  @Get('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // This route initiates the Google OAuth flow
    // The guard will handle the redirect to Google
    return { message: 'Google authentication initiated' };
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  googleAuthCallback(@Request() req, @Res() res: Response) {
    // After successful Google authentication, redirect to frontend with token
    const { access_token, refreshToken } = req.user;
    const redirectUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/social-callback?token=${access_token}&refreshToken=${refreshToken}`;
    return res.redirect(redirectUrl);
  }

  // Facebook OAuth routes
  @Get('facebook')
  @Public()
  @UseGuards(FacebookAuthGuard)
  facebookAuth() {
    // This route initiates the Facebook OAuth flow
    // The guard will handle the redirect to Facebook
    return { message: 'Facebook authentication initiated' };
  }

  @Get('facebook/callback')
  @Public()
  @UseGuards(FacebookAuthGuard)
  facebookAuthCallback(@Request() req, @Res() res: Response) {
    // After successful Facebook authentication, redirect to frontend with token
    const { access_token, refreshToken } = req.user;
    const redirectUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/social-callback?token=${access_token}&refreshToken=${refreshToken}`;
    return res.redirect(redirectUrl);
  }
}

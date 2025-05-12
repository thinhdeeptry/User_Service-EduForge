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
import { RefreshTokenGuard } from './passport/refresh-token-auth.guard';
import { Response } from 'express';
import { hashPasswordHelper } from 'src/helpers/util';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

  // Endpoint lấy refresh token mới
  @Post('token')
  @UseGuards(JwtAuthGuard)
  async getRefreshToken(@Body('refreshToken') refreshToken: string) {
    // JwtAuthGuard đã xác thực access token và đưa thông tin vào req.user
    console.log("check refresh>> ", refreshToken);

    if (!refreshToken) {
      throw new BadRequestException('Refresh token không được cung cấp');
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
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  // @Post('refresh')
  // async refreshToken(@Body('refreshToken') refreshToken: string) {
  //   return this.authService.refreshToken(refreshToken);
  // }
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

  @Post('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    console.log("req.user: ",req.user);
    const { accessToken, refreshToken } = req.user;
    return res.status(200).json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        image: req.user.image,
      },
      accessToken: accessToken,
      refreshToken: refreshToken
    });
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

  // Endpoint để xử lý thông tin người dùng từ Google mà frontend đã nhận được
  @Post('google-token')
  @Public()
  async googleToken(@Body() userData: any) {
    try {
      console.log("userData: ",userData);
      console.log("jwt_issuer: ",this.configService.get<string>("JWT_ISSUER"));
      // Xử lý thông tin người dùng từ Google
      const socialUser = {
        email: userData.email,
        name: userData.name,
        image: userData.image,
        provider: 'GOOGLE',
        providerId: userData.sub || userData.id,
        iss: this.configService.get<string>('JWT_ISSUER'),
      };
      console.log("socialUser: ",socialUser);
      // Gọi service để xử lý đăng nhập xã hội
      const result = await this.authService.socialLogin(socialUser);
      console.log("result: ",result);
      return result;
    } catch (error) {
      console.error('Google token login error:', error);
      throw new BadRequestException('Đăng nhập bằng Google thất bại');
    }
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

  // Endpoint để xử lý thông tin người dùng từ Facebook mà frontend đã nhận được
  @Post('facebook-token')
  @Public()
  async facebookToken(@Body() userData: any) {
    try {
      // Xử lý thông tin người dùng từ Facebook
      const socialUser = {
        email: userData.email,
        name: userData.name,
        image: userData.picture?.data?.url || userData.picture,
        provider: 'FACEBOOK',
        providerId: userData.id,
      };

      // Gọi service để xử lý đăng nhập xã hội
      const result = await this.authService.socialLogin(socialUser);
      return result;
    } catch (error) {
      console.error('Facebook token login error:', error);
      throw new BadRequestException('Đăng nhập bằng Facebook thất bại');
    }
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email không được để trống');
    }
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @Public()
  async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
    const { email, otp, newPassword } = body;
    
    if (!email || !otp || !newPassword) {
      throw new BadRequestException('Thiếu thông tin cần thiết');
    }
    
    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    // Find user by email
    const user = await this.authService.getUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Email không tồn tại trong hệ thống');
    }
    
    // Reset password with OTP verification
    return this.authService.resetPasswordWithOTP(user._id.toString(), otp, newPassword);
  }
  
@Patch('profile')
@UseGuards(JwtAuthGuard)
async updateProfile(
  @Request() req,
  @Body() updateProfileDto: {
    name?: string;
    phone?: string;
    address?: string;
    image?: string;
  }
) {
  const userId = req.user._id;
  const user = await this.authService.getUserById(userId);
  
  if (!user) {
    throw new BadRequestException('Người dùng không tồn tại');
  }
  
  // Update user profile
  await this.authService.updateUserProfile(userId, updateProfileDto);
  
  // Return updated user
  const updatedUser = await this.authService.getUserById(userId);
  return {
    message: 'Cập nhật thông tin cá nhân thành công',
    user: updatedUser
  };
}

// Add this endpoint for avatar upload
@Post('profile/avatar')
@UseGuards(JwtAuthGuard)
async updateAvatar(
  @Request() req,
  @Body() body: { imageUrl: string }
) {
  const userId = req.user._id;
  const user = await this.authService.getUserById(userId);
  
  if (!user) {
    throw new BadRequestException('Người dùng không tồn tại');
  }
  
  if (!body.imageUrl) {
    throw new BadRequestException('URL ảnh đại diện không được để trống');
  }
  
  // Update user avatar
  await this.authService.updateUserProfile(userId, { image: body.imageUrl });
  
  // Return updated user
  const updatedUser = await this.authService.getUserById(userId);
  return {
    message: 'Cập nhật ảnh đại diện thành công',
    user: updatedUser
  };
}
@Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const userId = req.user._id;
    const user = await this.authService.getUserById(userId);
    
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }
    
    return {
      message: 'Lấy thông tin cá nhân thành công',
      user: user
    };
  }
}

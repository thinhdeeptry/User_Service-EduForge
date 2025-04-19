
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
import { User } from 'src/modules/users/schemas/user.schema';

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
    console.log("check pass>>> ", pass);

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
    const jwtIssuer = this.configService.get<string>('JWT_ISSUER');
    console.log("check iss>>> ", jwtIssuer);
    const payload = { username: user.email, sub: user._id, role: user.role, iss: jwtIssuer };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
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
        createAt: user.createAt
      },
      accessToken: accessToken,
      refreshToken: refreshToken
    };
  }
  async refreshToken(refreshToken: string) {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const jwtIssuer = this.configService.get<string>('JWT_ISSUER');
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtSecret,
      });
      const user = await this.usersService.findBy_id(payload.sub);
      if (!user) throw new Error('User not found');
      const newAccessToken = this.jwtService.sign({ username: user.email, sub: user._id, role: user.role, iss: jwtIssuer });
      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
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
  // Modified to work with email instead of just ID
  async sendOTP(idOrEmail: string): Promise<void> {
    let user;
    
    // Check if the input is an email
    if (idOrEmail.includes('@')) {
      user = await this.usersService.findByEmail(idOrEmail);
      if (!user) {
        throw new BadRequestException('Email không tồn tại trong hệ thống');
      }
    } else {
      // If not an email, treat as ID
      user = await this.usersService.findBy_id(idOrEmail);
      if (!user) {
        throw new BadRequestException('User không tồn tại');
      }
    }
    
    const { otp } = await this.updateOTP(user._id.toString());
    
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

  // Add forgot password method
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return { message: 'Nếu email tồn tại, một mã OTP sẽ được gửi đến email của bạn' };
    }

    try {
      // Send OTP to user's email
      await this.sendOTP(email);
      return { message: 'Mã OTP đã được gửi đến email của bạn' };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new InternalServerErrorException('Không thể gửi mã OTP. Vui lòng thử lại.');
    }
  }

  // Add reset password method
  async resetPassword(id: string, otp: string, newPassword: string): Promise<{ message: string }> {
    // Verify OTP first
    const isValid = await this.verifyOTP(id, otp);
    
    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }
    
    // Hash the new password
    const hashedPassword = await hashPasswordHelper(newPassword);
    
    // Update user's password
    await this.usersService.update({
      _id: id,
      password: hashedPassword
    });
    
    return { message: 'Mật khẩu đã được cập nhật thành công' };
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

  async socialLogin(socialUser: any) {
    try {
      // Check if user exists with this email
      let user = await this.usersService.findByEmail(socialUser.email);

      if (user) {
        // If user exists but with different login method (LOCAL)
        if (user.accountType === 'LOCAL') {
          // Update user to link social account
          await this.usersService.update({
            _id: user._id.toString(),
            providerId: socialUser.providerId,
            name: user.name,
            email: user.email,
            password: user.password,
            otp: user.otp || '',
            otpExpiresAt: user.otpExpiresAt,
            accountType: socialUser.provider, // Update account type to match social provider
            // Keep the existing account type to maintain password login capability
          });
        } else if (user.accountType !== socialUser.provider) {
          // User exists but with a different social provider
          // We'll just log them in with the existing account
          // You could also update the account to link multiple providers if desired
        }
      } else {
        // Create new user with social login info
        const newUser = await this.usersService.createSocialUser({
          name: socialUser.name,
          email: socialUser.email,
          image: socialUser.image,
          accountType: socialUser.provider,
          providerId: socialUser.providerId,
          isActive: true, // Social login users are automatically activated
        });

        user = await this.usersService.findBy_id(newUser._id.toString());
      }

      // Generate JWT token and return user info
      return this.login(user);
    } catch (error) {
      console.error('Social login error:', error);
      throw new InternalServerErrorException('Đăng nhập bằng tài khoản xã hội thất bại');
    }
  }
}

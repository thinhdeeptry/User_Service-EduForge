
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
import { RedisService } from 'src/redis/redis.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    console.log(user);
    console.log("check pass>>> ", pass);

    if (!user) {
      throw new UnauthorizedException("Email hoặc password không hợp lệ");
    }
    const isValidPassword = await comparePasswordHelper(pass, user.password, user.accountType);
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
    console.log("check user   >>> ", user);
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
        createdAt: user.createdAt
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

  // Cập nhật OTP cho user - sử dụng Redis
  async updateOTP(id: string): Promise<{ otp: string; expiresAt: Date }> {
    try {
      console.log("check id>>> ", id);

      const user = await this.usersService.findBy_id(id);
      if (!user) throw new BadRequestException('User not found');

      // Tạo secret key mới nếu chưa có
      let secret = user.otpSecret;
      if (secret == null) {
        secret = this.generateSecret();
      }

      // Tạo mã OTP mới
      const otp = this.generateOTP(secret);
      const expirySeconds = this.configService.get<number>('REDIS_OTP_EXPIRY', 300); // 5 phút mặc định
      const expiresAt = new Date(Date.now() + expirySeconds * 1000);

      // Lưu OTP vào Redis thay vì database
      await this.redisService.saveOTP(user._id.toString(), secret, otp);

      // Trả về OTP và thời gian hết hạn để gửi qua email hoặc giao diện
      return { otp, expiresAt };
    } catch (error) {
      console.error('Error updating OTP:', error);
      throw new InternalServerErrorException('Không thể cập nhật OTP. Vui lòng thử lại.');
    }
  }
  // Modified to work with email instead of just ID
  // async sendOTP(idOrEmail: string): Promise<void> {
  //   let user;

  //   // Check if the input is an email
  //   if (idOrEmail.includes('@')) {
  //     user = await this.usersService.findByEmail(idOrEmail);
  //     if (!user) {
  //       throw new BadRequestException('Email không tồn tại trong hệ thống');
  //     }
  //   } else {
  //     // If not an email, treat as ID
  //     user = await this.usersService.findBy_id(idOrEmail);
  //     if (!user) {
  //       throw new BadRequestException('User không tồn tại');
  //     }
  //   }

  //   const { otp } = await this.updateOTP(user._id.toString());

  //   try {
  //     const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  //     const template = await fs.promises.readFile('src/mail/templates/register.hbs', 'utf8');
  //     const compiledTemplate = handlebars.compile(template);
  //     const html = compiledTemplate({
  //       name: user?.name ?? user?.email,
  //       activationCode: otp
  //     });
  //     const { data, error } = await resend.emails.send({
  //       from: 'EduForge<auth@eduforge.io.vn>',
  //       to: user?.email ? [user.email] : [],
  //       subject: 'Account Activation - EduForge',
  //       html: html
  //     });

  //     if (error) {
  //       console.error({ error });
  //       throw new InternalServerErrorException('Failed to send email');
  //     }

  //     console.log(`Send email success to ${user?.email}`);
  //   } catch (error) {
  //     console.error('Send email error:', error);
  //     throw new InternalServerErrorException('Không thể gửi mã OTP. Vui lòng thử lại.');
  //   }
  // }

  // Add forgot password method
  // async forgotPassword(email: string): Promise<{ message: string }> {
  //   const user = await this.usersService.findByEmail(email);
  //   if (!user) {
  //     // For security reasons, don't reveal if email exists or not
  //     return { message: 'Nếu email tồn tại, một mã OTP sẽ được gửi đến email của bạn' };
  //   }

  //   try {
  //     // Send OTP to user's email
  //     await this.sendOTP(email);
  //     return { message: 'Mã OTP đã được gửi đến email của bạn' };
  //   } catch (error) {
  //     console.error('Forgot password error:', error);
  //     throw new InternalServerErrorException('Không thể gửi mã OTP. Vui lòng thử lại.');
  //   }
  // }

  // Add reset password method
  async resetPassword(id: string, otp: string, newPassword: string): Promise<{ message: string }> {
    // Verify OTP first
    const isValid = await this.verifyOTP(id, otp);

    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Hash the new password
    const hashedPassword = await hashPasswordHelper(newPassword);
    const user = await this.usersService.findBy_id(id);
    // Update user's password
    await this.usersService.update({
      _id: id,
      name: user?.name || '',
      email: user?.email || '',
      password: hashedPassword,
      otp: '',
      otpExpiresAt: new Date(),
      accountType: user?.accountType || 'LOCAL',
    });

    return { message: 'Mật khẩu đã được cập nhật thành công' };
  }

  async verifyOTP(id: string, otp: string): Promise<boolean> {
    const user = await this.usersService.findBy_id(id);
    if (!user) throw new BadRequestException('User không tồn tại');

    // Lấy thông tin OTP từ Redis
    const otpData = await this.redisService.getOTP(id);
    if (!otpData || !otpData.secret) {
      throw new BadRequestException('OTP không tồn tại hoặc đã hết hạn');
    }

    // Cấu hình và kiểm tra OTP
    authenticator.options = { digits: 6, step: 300 };
    const isValid = authenticator.check(otp, otpData.secret);
    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

    // Kích hoạt tài khoản
    await this.usersService.updateIsActive(user._id.toString(), true);

    // Xóa OTP khỏi Redis sau khi xác thực thành công
    await this.redisService.deleteOTP(id);

    return true;
  }

  async socialLogin(socialUser: any) {
    try {
      // Check if user exists with this email
      let user = await this.usersService.findByEmail(socialUser.email);
      console.log("check user>>> ", user);
      if (user) {
        //nếu user tồn tại nhưng chưa có image thì update image từ socialUser
        if (!user.image && socialUser.image) {
          // Convert Mongoose document to plain object before updating
          const userObj = user.toObject ? user.toObject() : user;
          await this.usersService.update({
            _id: userObj._id.toString(),
            name: userObj.name,
            email: userObj.email,
            image: socialUser.image,
            password: userObj.password,
            accountType: userObj.accountType,
            isActive: userObj.isActive,
            otpExpiresAt: user.otpExpiresAt,
            otp: user.otp || '',
            providerId: socialUser.providerId,
            // Remove role property since it's not in UpdateUserDto
          });
          
          // Refresh user data after update
          user = await this.usersService.findByEmail(socialUser.email);
        }
        // If user exists but with different login method (LOCAL)
        if (user?.accountType === 'LOCAL') {
          // Update user to link social account
          await this.usersService.update({
            _id: user._id.toString(),
            providerId: socialUser.providerId,
            name: user.name,
            image: user.image,
            email: user.email,
            password: user.password,
            otp: user.otp || '',
            otpExpiresAt: user.otpExpiresAt,
            isActive: true,
            accountType: "GOOGLE", // Update account type to match social provider
            // Keep the existing account type to maintain password login capability
          });
        } else if (user?.accountType !== socialUser.provider) {
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
          createdAt: new Date(),
          isActive: true, // Social login users are automatically activated
        });
        console.log("check newUser>>> ", newUser);
        user = await this.usersService.findBy_id(newUser._id.toString());
      }
      console.log("check user in login gg>>> ", user);
      // Generate JWT token and return user info
      return this.login(user);
    } catch (error) {
      console.error('Social login error:', error);
      throw new InternalServerErrorException('Đăng nhập bằng tài khoản xã hội thất bại');
    }
  }
  // Get user by email - helper method
  async getUserByEmail(email: string) {
    return this.usersService.findByEmail(email);
  }

  // Get user by ID - helper method
  async getUserById(id: string) {
    return this.usersService.findBy_id(id);
  }

  // Update user password - helper method
  async updateUserPassword(userId: string, hashedPassword: string) {
    const user = await this.usersService.findBy_id(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.usersService.update({
      _id: userId,
      name: user.name,
      email: user.email,
      password: hashedPassword,
      accountType: user.accountType || 'LOCAL',
      otp: user.otp || '',
      otpExpiresAt: user.otpExpiresAt,
    });
  }

  // Modified sendOTP to handle forgot password
  async sendOTP(idOrEmail: string, isPasswordReset: boolean = false): Promise<void> {
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

      // Choose template based on whether this is for password reset or account activation
      const templatePath = isPasswordReset
        ? 'src/mail/templates/forgot-password.hbs'
        : 'src/mail/templates/register.hbs';

      const template = await fs.promises.readFile(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(template);
      const html = compiledTemplate({
        name: user?.name ?? user?.email,
        activationCode: otp
      });

      const subject = isPasswordReset
        ? 'Đặt lại mật khẩu - EduForge'
        : 'Kích hoạt tài khoản - EduForge';

      const { data, error } = await resend.emails.send({
        from: 'EduForge<auth@eduforge.io.vn>',
        to: user?.email ? [user.email] : [],
        subject: subject,
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

  // Updated forgot password method
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return { message: 'Nếu email tồn tại, một mã OTP sẽ được gửi đến email của bạn' };
    }

    try {
      // Send OTP to user's email with password reset flag
      await this.sendOTP(email, true);
      return {
        message: 'Mã OTP đã được gửi đến email của bạn',
        // Don't return user ID for security reasons
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new InternalServerErrorException('Không thể gửi mã OTP. Vui lòng thử lại.');
    }
  }
  async resetPasswordWithOTP(id: string, otp: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersService.findBy_id(id);
    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    // Lấy thông tin OTP từ Redis
    const otpData = await this.redisService.getOTP(id);
    if (!otpData || !otpData.secret) {
      throw new BadRequestException('OTP không tồn tại hoặc đã hết hạn');
    }

    // Xác thực OTP
    authenticator.options = { digits: 6, step: 300 };
    const isValid = authenticator.check(otp, otpData.secret);
    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

    // Hash mật khẩu mới
    const hashedPassword = await hashPasswordHelper(newPassword);

    // Cập nhật mật khẩu của người dùng
    await this.usersService.update({
      _id: id,
      name: user.name,
      email: user.email,
      password: hashedPassword,
      accountType: user.accountType || 'LOCAL',
      otp: '',
      otpExpiresAt: new Date(),
    });

    // Xóa OTP khỏi Redis sau khi đổi mật khẩu thành công
    await this.redisService.deleteOTP(id);

    return { message: 'Mật khẩu đã được cập nhật thành công' };
  }

  async updateUserProfile(userId: string, profileData: {
    name?: string;
    phone?: string;
    address?: string;
    image?: string;
  }) {
    const user = await this.usersService.findBy_id(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
  
    // Create update object with only the fields that are provided
    const updateData: UpdateUserDto = {
      _id: userId,
      name: profileData.name !== undefined ? profileData.name : user.name,
      email: user.email,
      password: user.password,
      phone: profileData.phone !== undefined ? profileData.phone : user.phone,
      address: profileData.address !== undefined ? profileData.address : user.address,
      image: profileData.image !== undefined ? profileData.image : user.image,
      accountType: user.accountType || 'LOCAL',
      otp: user.otp || '',
      otpExpiresAt: user.otpExpiresAt,
      isActive: user.isActive
    };
  
    return this.usersService.update(updateData);
  }
}

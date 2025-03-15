
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException("Email/Password không hợp lệ");
    }
    if (user.isActive === false) {
      throw new BadRequestException({
        message: "Tài khoản chưa được kích hoạt",
        userId: user._id.toString(), // Convert ObjectId to string if needed
        status: "INACTIVE"
      });
    }
    return user;
  }
}

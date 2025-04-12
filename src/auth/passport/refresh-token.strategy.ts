import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'refresh-token') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    // Lấy refresh token từ header Authorization
    const refreshToken = req.get('Authorization')?.replace('Bearer', '').trim();
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không được cung cấp');
    }

    // Kiểm tra xem user có tồn tại không
    const user = await this.usersService.findBy_id(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    // Trả về payload và refreshToken để sử dụng trong controller
    return { 
      ...payload,
      refreshToken,
    };
  }
}


import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),//lấy jwt từ header
      ignoreExpiration: false,//kiểm tra thời hạn, nếu hết hạn thì từ chối
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }
// passport giải mã payload và gọi validate
  async validate(payload: any) { //sub là id user, được đặt trong token
    return { _id: payload.sub, username: payload.username, role: payload.role };
  }
}

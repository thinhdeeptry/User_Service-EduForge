
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePasswordHelper } from 'src/helpers/util';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService,
    private jwtService: JwtService
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
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
    const payload = { username: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

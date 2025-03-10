
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../decorator/customAnotation';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {// kế thường jwt liên kết với jwt trategy

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException("Access Token không hợp lệ hoặc đã hết hạn");
    }
    return user;
  }
}

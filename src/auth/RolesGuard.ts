import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true; // Không yêu cầu role, cho phép tất cả

    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1]; // Lấy token từ header
    if (!token) return false;

    try {
      const decoded = this.jwtService.verify(token);
      const userRole = decoded.role;
      return requiredRoles.some((role) => role === userRole);
    } catch (error) {
      return false;
    }
  }
}
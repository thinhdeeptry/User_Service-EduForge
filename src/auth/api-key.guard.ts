import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresApiKey = this.reflector.getAllAndOverride<boolean>(
      'requiresApiKey',
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (!requiresApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const serviceName = request.headers['x-service-name'];

    // Get service configuration
    const services = this.configService.get('services');
    const serviceConfig = services[serviceName];
    console.log("check serviceConfig",serviceConfig)
    console.log("check services>>", services)
    if (!apiKey || !serviceConfig || serviceConfig.apiKey !== apiKey) {
      throw new UnauthorizedException('Invalid API Key');
    }

    request.service = {
      name: serviceName,
      permissions: this.getServicePermissions(serviceName),
    };
    
    return true;
  }

  private getServicePermissions(serviceName: string): string[] {
    const permissionsMap = {
      courseService: ['user.basic', 'user.courses'],
      paymentService: ['user.basic', 'user.billing'],
      notificationService: ['user.basic', 'user.notifications'],
    };
    
    return permissionsMap[serviceName] || ['user.basic'];
  }
}
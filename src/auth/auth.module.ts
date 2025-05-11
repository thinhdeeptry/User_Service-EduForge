import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/modules/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './passport/local.strategy';
import { JwtStrategy } from './passport/jwt.strategy';
import { GoogleStrategy } from './passport/google.strategy';
import { FacebookStrategy } from './passport/facebook.strategy';
import { RefreshTokenStrategy } from './passport/refresh-token.strategy';
// Redis module is imported from src/redis/redis.module
import { RedisModule } from 'src/redis/redis.module'; // Custom Redis service module
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from 'src/auth/RolesGuard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Áp dụng RolesGuard toàn cục
    },
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    RefreshTokenStrategy,
  ],
})
export class AuthModule {}

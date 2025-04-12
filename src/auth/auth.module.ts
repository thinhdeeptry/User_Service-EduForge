import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/modules/users/users.module';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './passport/local.strategy';
import { JwtStrategy } from './passport/jwt.strategy';
import { GoogleStrategy } from './passport/google.strategy';
import { FacebookStrategy } from './passport/facebook.strategy';
import { MailerModule } from '@nestjs-modules/mailer';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './RolesGuard';

@Module({
  imports:[
    UsersModule,
    PassportModule,
    MailerModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        global:true,
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
],
})
export class AuthModule {}

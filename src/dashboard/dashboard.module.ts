import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JwtModule } from '@nestjs/jwt'; // Thêm dòng này
import { ConfigModule, ConfigService } from '@nestjs/config'; // Thêm nếu cần
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [
    UsersModule,
    // Thêm JwtModule vào imports
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

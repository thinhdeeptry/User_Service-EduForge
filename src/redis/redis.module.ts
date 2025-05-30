import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as IoRedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ConfigModule,
    IoRedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<RedisModuleOptions> => {
        return {
          type: 'single',
          options: {
            host: configService.get('REDIS_HOST', 'redis'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD', '123456'),
            db: configService.get('REDIS_DB', 0),
          }
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}


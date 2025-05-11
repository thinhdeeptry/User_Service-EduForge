import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Lưu OTP vào Redis
   * @param userId ID của người dùng
   * @param otpSecret Secret key để tạo OTP
   * @param otp Mã OTP
   * @returns Promise<void>
   */
  async saveOTP(userId: string, otpSecret: string, otp: string): Promise<void> {
    const expiryTime = this.configService.get<number>('REDIS_OTP_EXPIRY', 300); // 5 phút mặc định
    const otpKey = `otp:${userId}`;
    
    // Lưu thông tin OTP dưới dạng hash
    await this.redis.hset(otpKey, {
      secret: otpSecret,
      otp: otp,
    });
    
    // Thiết lập thời gian hết hạn
    await this.redis.expire(otpKey, expiryTime);
  }

  /**
   * Lấy thông tin OTP từ Redis
   * @param userId ID của người dùng
   * @returns Promise<{ secret: string; otp: string } | null>
   */
  async getOTP(userId: string): Promise<{ secret: string; otp: string } | null> {
    const otpKey = `otp:${userId}`;
    const otpData = await this.redis.hgetall(otpKey);
    
    if (!otpData || Object.keys(otpData).length === 0) {
      return null;
    }
    
    return {
      secret: otpData.secret,
      otp: otpData.otp,
    };
  }

  /**
   * Xóa OTP khỏi Redis
   * @param userId ID của người dùng
   * @returns Promise<void>
   */
  async deleteOTP(userId: string): Promise<void> {
    const otpKey = `otp:${userId}`;
    await this.redis.del(otpKey);
  }

  /**
   * Kiểm tra xem OTP có tồn tại không
   * @param userId ID của người dùng
   * @returns Promise<boolean>
   */
  async hasOTP(userId: string): Promise<boolean> {
    const otpKey = `otp:${userId}`;
    const exists = await this.redis.exists(otpKey);
    return exists === 1;
  }

  /**
   * Lấy thời gian còn lại của OTP (tính bằng giây)
   * @param userId ID của người dùng
   * @returns Promise<number> Thời gian còn lại tính bằng giây, 0 nếu không tồn tại
   */
  async getOTPTTL(userId: string): Promise<number> {
    const otpKey = `otp:${userId}`;
    const ttl = await this.redis.ttl(otpKey);
    return ttl > 0 ? ttl : 0;
  }
}

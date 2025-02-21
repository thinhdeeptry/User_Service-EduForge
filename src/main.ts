import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  //ValidationPipe: kiểm tra dữ liệu đầu vào của request
  app.useGlobalPipes(new ValidationPipe({
    //bật chế độ tự động loại bỏ các trường không cần thiết
    whitelist: true,
    //ném exception khi không phải kiểu dữ liệu được khai báo
    forbidNonWhitelisted: true,
    transform: true,  // Tự động transform các kiểu dữ liệu
  }));
  //exclude: thay đổi đường dẫn mặc định của api
  app.setGlobalPrefix('api/v1',{ exclude: [''] });

  await app.listen(port);
}
bootstrap();

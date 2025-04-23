import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiKeyGuard } from 'src/auth/api-key.guard'; 

export function ApiKey() {
  return applyDecorators(
    SetMetadata('requiresApiKey', true),
    UseGuards(ApiKeyGuard)
  );
}
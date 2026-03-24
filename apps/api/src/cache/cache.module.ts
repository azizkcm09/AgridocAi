import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()   // Makes CacheService available everywhere without importing CacheModule in each module
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // <--- This makes Prisma available everywhere
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // <--- This allows other modules to use it
})
export class PrismaModule {}
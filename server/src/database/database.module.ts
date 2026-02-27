import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseModule — global module that provides PrismaService to the entire app.
 *
 * Marked @Global() so any module can inject PrismaService without needing to
 * import DatabaseModule explicitly. This is the correct NestJS pattern for
 * infrastructure services used everywhere (database, config, logging).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

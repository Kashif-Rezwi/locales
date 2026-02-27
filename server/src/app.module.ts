import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { GithubModule } from './github/github.module';
import { AdaptersModule } from './adapters/adapters.module';

/**
 * AppModule — root NestJS module.
 *
 * Import order:
 *   1. ConfigModule   — must be first; provides env vars to everything else
 *   2. DatabaseModule — global PrismaService, available everywhere
 *   3. HealthModule   — public health check (no auth required)
 *   4. UserModule     — user persistence (Chunk 3)
 *   5. AuthModule     — AuthGuard + token validation (Chunk 3)
 *   6. GithubModule   — GitHub API integration (Chunk 3)
 *   7. AdaptersModule — framework adapter registry (Chunk 4)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    DatabaseModule,
    HealthModule,
    UserModule,
    AuthModule,
    GithubModule,
    AdaptersModule,
  ],
})
export class AppModule { }

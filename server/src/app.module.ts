import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

/**
 * AppModule — root NestJS module.
 *
 * Import order matters conceptually:
 *   1. ConfigModule   — must be first; provides env vars to everything else
 *   2. DatabaseModule — global PrismaService, available everywhere
 *   3. HealthModule   — public health check endpoint
 *
 * Future chunks add their modules here:
 *   Chunk 3  → AuthModule, GithubModule
 *   Chunk 4  → AdaptersModule
 *   Chunk 6  → TranslationModule
 *   Chunk 7  → TranslationMemoryModule
 *   Chunk 8  → WorkspaceModule
 *   Chunk 11 → GitDeliveryModule
 *   Chunk 12 → PipelineModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: {
        // allowUnknown: true so that OS-level env vars (PATH, HOME, etc.) are
        // ignored by Joi — we only validate the keys we explicitly declare.
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}

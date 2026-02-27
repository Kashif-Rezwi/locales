import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { GithubModule } from './github/github.module';
import { AdaptersModule } from './adapters/adapters.module';
import { ExtractionModule } from './extraction/extraction.module';
import { ProvidersModule } from './providers/providers.module';
import { TranslationEngineModule } from './translation-engine/translation-engine.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { CodeModModule } from './code-mod/code-mod.module';
import { GitDeliveryModule } from './git-delivery/git-delivery.module';


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
 *   7. AdaptersModule      — framework adapter registry (Chunk 4)
 *   8. ExtractionModule    — Babel AST string extractor (Chunk 5)
 *   9. ProvidersModule     — translation provider router (Chunk 6)
 *  10. TranslationEngineModule — TM + provider pipeline (Chunk 7)
 *  11. WorkspaceModule         — E2B or local workspace isolation (Chunk 8)
 *  12. CodeModModule           — Babel code mod + runtime generator (Chunk 9)
 *  13. GitDeliveryModule       — Atomic PR generation for locales (Chunk 11)
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
    ExtractionModule,
    ProvidersModule,
    TranslationEngineModule,
    WorkspaceModule,
    CodeModModule,
    GitDeliveryModule,
  ],
})
export class AppModule { }

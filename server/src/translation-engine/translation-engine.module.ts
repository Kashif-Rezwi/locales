import { Module } from '@nestjs/common';
import { TranslationEngineService } from './translation-engine.service';
import { ProvidersModule } from '../providers/providers.module';

/**
 * TranslationEngineModule — the TM-augmented translation layer.
 *
 * Imports ProvidersModule to inject ProviderRouterService.
 * DatabaseModule is global (PrismaService available everywhere).
 * Exports TranslationEngineService for the pipeline (Chunk 12).
 */
@Module({
    imports: [ProvidersModule],
    providers: [TranslationEngineService],
    exports: [TranslationEngineService],
})
export class TranslationEngineModule { }

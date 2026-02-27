import { Module, OnModuleInit } from '@nestjs/common';
import { ProviderRouterService } from './provider-router.service';
import { ProvidersController } from './providers.controller';
import { DeepLProvider } from './deepl.provider';
import { GoogleTranslateProvider } from './google-translate.provider';
import { OpenAIProvider } from './openai.provider';
import { LingoDevProvider } from './lingo-dev.provider';

/**
 * ProvidersModule — wires all translation providers into the NestJS DI system.
 *
 * onModuleInit registers providers in priority order:
 *   1. deepl            (best quality, fast batch, explicit pricing)
 *   2. google-translate (fast, reliable, broad language coverage)
 *   3. openai           (highest flexibility, can follow glossary in prompt)
 *   4. lingo-dev        (last resort fallback)
 *
 * Providers with missing API keys are silently skipped (isAvailable() = false).
 * Exports ProviderRouterService for use by the Translation Memory engine (Chunk 7).
 */
@Module({
    providers: [
        ProviderRouterService,
        DeepLProvider,
        GoogleTranslateProvider,
        OpenAIProvider,
        LingoDevProvider,
    ],
    controllers: [ProvidersController],
    exports: [ProviderRouterService],
})
export class ProvidersModule implements OnModuleInit {
    constructor(
        private readonly router: ProviderRouterService,
        private readonly deepl: DeepLProvider,
        private readonly google: GoogleTranslateProvider,
        private readonly openai: OpenAIProvider,
        private readonly lingo: LingoDevProvider,
    ) { }

    onModuleInit(): void {
        // Priority order: DeepL → Google → OpenAI → Lingo.dev
        this.router.register(this.deepl);
        this.router.register(this.google);
        this.router.register(this.openai);
        this.router.register(this.lingo);
    }
}

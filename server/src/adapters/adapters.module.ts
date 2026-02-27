import { Module, OnModuleInit } from '@nestjs/common';
import { AdapterRegistryService } from './adapter-registry.service';
import { AdaptersController } from './adapters.controller';
import { NextjsAppRouterAdapter } from './nextjs-app-router.adapter';
import { NextjsPagesRouterAdapter } from './nextjs-pages-router.adapter';
import { ViteReactAdapter } from './vite-react.adapter';
import { RemixAdapter } from './remix.adapter';

/**
 * AdaptersModule — wires all framework adapters into the NestJS DI system.
 *
 * onModuleInit registers them in priority order:
 *   1. nextjs-app-router  (confidence 0.95 — beats Pages Router in hybrid repos)
 *   2. nextjs-pages-router (confidence 0.90)
 *   3. vite-react         (confidence 0.95)
 *   4. remix              (confidence 0.95)
 *
 * Exports AdapterRegistryService so the pipeline module can call detect().
 */
@Module({
    providers: [
        AdapterRegistryService,
        NextjsAppRouterAdapter,
        NextjsPagesRouterAdapter,
        ViteReactAdapter,
        RemixAdapter,
    ],
    controllers: [AdaptersController],
    exports: [AdapterRegistryService],
})
export class AdaptersModule implements OnModuleInit {
    constructor(
        private readonly registry: AdapterRegistryService,
        private readonly nextjsAppRouter: NextjsAppRouterAdapter,
        private readonly nextjsPagesRouter: NextjsPagesRouterAdapter,
        private readonly viteReact: ViteReactAdapter,
        private readonly remix: RemixAdapter,
    ) { }

    onModuleInit(): void {
        this.registry.register(this.nextjsAppRouter);
        this.registry.register(this.nextjsPagesRouter);
        this.registry.register(this.viteReact);
        this.registry.register(this.remix);
    }
}

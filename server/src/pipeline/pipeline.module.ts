import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { GithubModule } from '../github/github.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { TranslationEngineModule } from '../translation-engine/translation-engine.module';
import { GitDeliveryModule } from '../git-delivery/git-delivery.module';
import { CodeModModule } from '../code-mod/code-mod.module';

@Module({
    imports: [
        GithubModule,
        WorkspaceModule,
        AdaptersModule,
        TranslationEngineModule,
        GitDeliveryModule,
        CodeModModule,
    ],
    controllers: [PipelineController],
    providers: [PipelineService],
    exports: [PipelineService],
})
export class PipelineModule { }

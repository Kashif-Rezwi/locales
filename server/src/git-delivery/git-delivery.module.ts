import { Module } from '@nestjs/common';
import { GitDeliveryService } from './git-delivery.service';
import { GithubModule } from '../github/github.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
    imports: [GithubModule, ProvidersModule],
    providers: [GitDeliveryService],
    exports: [GitDeliveryService],
})
export class GitDeliveryModule { }

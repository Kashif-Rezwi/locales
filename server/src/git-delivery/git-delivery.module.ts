import { Module } from '@nestjs/common';
import { GitDeliveryService } from './git-delivery.service';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [GithubModule],
  providers: [GitDeliveryService],
  exports: [GitDeliveryService],
})
export class GitDeliveryModule {}

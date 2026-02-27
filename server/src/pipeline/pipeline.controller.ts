import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Sse,
  MessageEvent,
  Logger,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { PipelineService } from './pipeline.service';
import type { JobSubmitDto } from './pipeline.types';
import { Observable } from 'rxjs';
import type { Request } from 'express';

@UseGuards(AuthGuard)
@Controller('api/jobs')
export class PipelineController {
  private readonly logger = new Logger(PipelineController.name);

  constructor(private readonly pipelineService: PipelineService) {}

  @Post()
  async createJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JobSubmitDto,
  ) {
    const job = await this.pipelineService.createJob(user.userId, dto);
    // Fire-and-forget — runJob manages its own errors and state
    this.pipelineService.runJob(user, job.id).catch((err) => {
      this.logger.error(`Job ${job.id} run failed: ${String(err)}`);
    });
    return { jobId: job.id };
  }

  @Get()
  async listJobs(@CurrentUser() user: AuthenticatedUser) {
    return this.pipelineService.listJobs(user.userId);
  }

  @Get(':id')
  async getJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.pipelineService.getJob(user.userId, id);
  }

  /**
   * Server-Sent Events endpoint for real-time log streaming.
   */
  @Sse(':id/events')
  streamEvents(
    @Param('id') id: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    req.on('close', () => {
      // ReplaySubject doesn't need cleanup on client disconnect
    });
    return this.pipelineService.streamEvents(id);
  }
}

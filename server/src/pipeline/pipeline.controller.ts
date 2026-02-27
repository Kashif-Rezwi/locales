import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    UseGuards,
    Sse,
    MessageEvent,
    Req,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PipelineService } from './pipeline.service';
import type { JobSubmitDto } from './pipeline.types';
import { Observable } from 'rxjs';
import type { Request } from 'express';

@UseGuards(AuthGuard)
@Controller('api/jobs')
export class PipelineController {
    constructor(private readonly pipelineService: PipelineService) { }

    @Post()
    async createJob(
        @CurrentUser() user: any,
        @Body() dto: JobSubmitDto,
    ) {
        const job = await this.pipelineService.createJob(user.sub, dto);
        // Fire and forget runJob (it manages its own errors and state)
        this.pipelineService.runJob(user.sub, job.id).catch(err => {
            console.error('Job run failed:', err);
        });
        return { jobId: job.id };
    }

    @Get()
    async listJobs(@CurrentUser() user: any) {
        return this.pipelineService.listJobs(user.sub);
    }

    @Get(':id')
    async getJob(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.pipelineService.getJob(user.sub, id);
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
            // We could handle disconnects here, but ReplaySubject doesn't care.
        });
        return this.pipelineService.streamEvents(id);
    }
}

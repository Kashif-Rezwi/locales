import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { E2BWorkspaceProvider } from './e2b-workspace.provider';
import { LocalWorkspaceProvider } from './local-workspace.provider';

/**
 * WorkspaceModule — provides isolated workspace environments for pipeline jobs.
 *
 * Exports WorkspaceService — the pipeline (Chunk 12) injects this to
 * create/clone/read/destroy workspaces for each job.
 *
 * Provider selection happens in WorkspaceService.onModuleInit:
 *   E2B_API_KEY set → E2BWorkspaceProvider (production)
 *   E2B_API_KEY absent → LocalWorkspaceProvider (dev/test)
 */
@Module({
    providers: [WorkspaceService, E2BWorkspaceProvider, LocalWorkspaceProvider],
    exports: [WorkspaceService],
})
export class WorkspaceModule { }

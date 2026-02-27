import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WorkspaceProvider, WorkspaceHandle } from './workspace.types';
import { E2BWorkspaceProvider } from './e2b-workspace.provider';
import { LocalWorkspaceProvider } from './local-workspace.provider';

/** Default workspace timeout: 10 minutes. */
const WORKSPACE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * WorkspaceService — the single entry point for workspace operations.
 *
 * Auto-selects the provider on startup:
 *   - E2B_API_KEY present → E2BWorkspaceProvider (production isolation)
 *   - E2B_API_KEY absent  → LocalWorkspaceProvider (dev/test, no isolation)
 *
 * All operations are wrapped with a WORKSPACE_TIMEOUT_MS timeout.
 * WorkspaceService itself is OnModuleDestroy-safe — each provider handles its own cleanup.
 */
@Injectable()
export class WorkspaceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkspaceService.name);
  private provider!: WorkspaceProvider;

  constructor(
    private readonly e2b: E2BWorkspaceProvider,
    private readonly local: LocalWorkspaceProvider,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.provider = this.e2b.isAvailable() ? this.e2b : this.local;
    this.logger.log(`Workspace provider selected: ${this.provider.name}`);
  }

  async onModuleDestroy(): Promise<void> {
    // Each concrete provider handles its own cleanup via its own OnModuleDestroy
  }

  /** Creates a new isolated workspace. */
  async create(): Promise<WorkspaceHandle> {
    return this.withTimeout(() => this.provider.create(), 'create');
  }

  /**
   * Shallow-clones a repo at the given branch into the workspace.
   * Throws a structured error if clone fails.
   */
  async clone(
    handle: WorkspaceHandle,
    repoUrl: string,
    branch: string,
  ): Promise<void> {
    return this.withTimeout(
      () => this.provider.clone(handle, repoUrl, branch),
      'clone',
    );
  }

  /**
   * Lists all files matching a glob pattern relative to the workspace root.
   * Example: await workspace.listFiles(handle, '**\/*.tsx')
   */
  async listFiles(handle: WorkspaceHandle, pattern: string): Promise<string[]> {
    return this.withTimeout(
      () => this.provider.listFiles(handle, pattern),
      'listFiles',
    );
  }

  /**
   * Reads a file from the workspace.
   * Returns null if the file does not exist — never throws on ENOENT.
   */
  async readFile(
    handle: WorkspaceHandle,
    filePath: string,
  ): Promise<string | null> {
    return this.withTimeout(
      () => this.provider.readFile(handle, filePath),
      'readFile',
    );
  }

  /**
   * Destroys the workspace. Must be called in a finally block.
   * Safe to call multiple times.
   */
  async destroy(handle: WorkspaceHandle): Promise<void> {
    try {
      await this.provider.destroy(handle);
    } catch (err: unknown) {
      // Swallow destroy errors — pipeline should not fail because cleanup failed
      this.logger.warn(
        `Workspace destroy failed for ${handle.id}: ${String(err)}`,
      );
    }
  }

  /** Returns the name of the active provider — for logging and diagnostics. */
  getProviderName(): string {
    return this.provider?.name ?? 'uninitialized';
  }

  private async withTimeout<T>(
    fn: () => Promise<T>,
    operation: string,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Workspace ${operation} timed out after ${WORKSPACE_TIMEOUT_MS}ms`,
              ),
            ),
          WORKSPACE_TIMEOUT_MS,
        ),
      ),
    ]);
  }
}

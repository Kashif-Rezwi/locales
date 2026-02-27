import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import type { WorkspaceProvider, WorkspaceHandle } from './workspace.types';

/**
 * E2BWorkspaceProvider — production workspace backed by E2B isolated sandboxes.
 *
 * Each call to create() spins up a fresh E2B sandbox.
 * All operations (clone, list, read) are proxied to that sandbox.
 * destroy() kills the sandbox and frees E2B resources.
 *
 * onModuleDestroy kills any sandboxes that survived a pipeline crash.
 */
@Injectable()
export class E2BWorkspaceProvider
  implements WorkspaceProvider, OnModuleDestroy
{
  readonly name = 'e2b';
  private readonly logger = new Logger(E2BWorkspaceProvider.name);
  private readonly apiKey: string | undefined;

  /** Map of workspaceId → Sandbox instance for cleanup on shutdown. */
  private readonly activeSandboxes = new Map<string, unknown>();

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('E2B_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async create(): Promise<WorkspaceHandle> {
    const { Sandbox } = await import('@e2b/code-interpreter');
    const sandbox = await (
      Sandbox as {
        create: (
          opts: Record<string, unknown>,
        ) => Promise<{ sandboxId: string } & Record<string, unknown>>;
      }
    ).create({ apiKey: this.apiKey });
    const id = (sandbox as { sandboxId: string }).sandboxId;
    this.activeSandboxes.set(id, sandbox);
    this.logger.debug(`Sandbox created: ${id}`);
    return { id, workDir: '/home/user/repo' };
  }

  async clone(
    handle: WorkspaceHandle,
    repoUrl: string,
    branch: string,
  ): Promise<void> {
    const sandbox = this.activeSandboxes.get(handle.id) as
      | {
          runCode: (
            cmd: string,
            opts?: unknown,
          ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
        }
      | undefined;

    if (!sandbox)
      throw new Error(`E2B: no active sandbox for workspace ${handle.id}`);

    const cmd = `git clone --depth 1 --branch ${branch} ${repoUrl} ${handle.workDir} 2>&1`;
    const result = await sandbox.runCode(cmd);

    if (result.exitCode !== 0) {
      throw new Error(
        `E2B clone failed (exit ${result.exitCode}): ${result.stdout}`,
      );
    }
    this.logger.debug(`Cloned ${repoUrl}@${branch} into sandbox ${handle.id}`);
  }

  async listFiles(handle: WorkspaceHandle, pattern: string): Promise<string[]> {
    const sandbox = this.activeSandboxes.get(handle.id) as
      | {
          runCode: (
            cmd: string,
          ) => Promise<{ stdout: string; exitCode: number }>;
        }
      | undefined;

    if (!sandbox)
      throw new Error(`E2B: no active sandbox for workspace ${handle.id}`);

    // find all files, then filter by glob pattern using minimatch
    const result = await sandbox.runCode(
      `find ${handle.workDir} -type f | sed 's|${handle.workDir}/||'`,
    );
    if (result.exitCode !== 0) return [];

    const { minimatch } = await import('minimatch');
    const allFiles = result.stdout.split('\n').filter(Boolean);
    return allFiles.filter((f) => minimatch(f, pattern));
  }

  async readFile(
    handle: WorkspaceHandle,
    filePath: string,
  ): Promise<string | null> {
    const sandbox = this.activeSandboxes.get(handle.id) as
      | {
          files?: { read?: (p: string) => Promise<string | null> };
          filesystem?: { read?: (p: string) => Promise<string | null> };
        }
      | undefined;

    if (!sandbox) return null;

    const absPath = path.join(handle.workDir, filePath);
    try {
      // Try the files/filesystem API (SDK varies)
      const fs =
        ((sandbox as Record<string, unknown>).files as
          | { read: (p: string) => Promise<string> }
          | undefined) ??
        ((sandbox as Record<string, unknown>).filesystem as
          | { read: (p: string) => Promise<string> }
          | undefined);

      if (fs?.read) return await fs.read(absPath);

      // Fallback: cat via runCode
      const { runCode } = sandbox as {
        runCode: (cmd: string) => Promise<{ stdout: string; exitCode: number }>;
      };
      const result = await runCode(`cat "${absPath}" 2>/dev/null`);
      return result.exitCode === 0 ? result.stdout : null;
    } catch {
      return null;
    }
  }

  async destroy(handle: WorkspaceHandle): Promise<void> {
    const sandbox = this.activeSandboxes.get(handle.id) as
      | { kill?: () => Promise<void> }
      | undefined;
    if (!sandbox) return;
    try {
      await sandbox.kill?.();
      this.activeSandboxes.delete(handle.id);
      this.logger.debug(`Sandbox destroyed: ${handle.id}`);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to destroy sandbox ${handle.id}: ${String(err)}`,
      );
    }
  }

  /** Kill all surviving sandboxes on server shutdown. */
  async onModuleDestroy(): Promise<void> {
    const ids = Array.from(this.activeSandboxes.keys());
    if (ids.length === 0) return;
    this.logger.warn(
      `Cleaning up ${ids.length} surviving sandbox(es) on shutdown`,
    );
    await Promise.allSettled(
      ids.map((id) => this.destroy({ id, workDir: '' })),
    );
  }
}

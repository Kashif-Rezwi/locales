import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import fg from 'fast-glob';
import type { WorkspaceProvider, WorkspaceHandle } from './workspace.types';

/**
 * LocalWorkspaceProvider — dev/test workspace using temp directories.
 *
 * No API key required. Uses simple-git for cloning and fast-glob for file listing.
 * Clones into OS temp dirs; destroy() removes them recursively.
 *
 * Selected by WorkspaceService when E2B_API_KEY is absent.
 */
@Injectable()
export class LocalWorkspaceProvider
  implements WorkspaceProvider, OnModuleDestroy
{
  readonly name = 'local';
  private readonly logger = new Logger(LocalWorkspaceProvider.name);

  /** Track active temp dirs for cleanup on server shutdown. */
  private readonly activeDirs = new Set<string>();

  isAvailable(): boolean {
    return true; // Always available — no external dependencies
  }

  async create(): Promise<WorkspaceHandle> {
    const id = randomUUID();
    const workDir = path.join(os.tmpdir(), `locales-ws-${id}`);
    await fs.mkdir(workDir, { recursive: true });
    this.activeDirs.add(workDir);
    this.logger.debug(`Local workspace created: ${workDir}`);
    return { id, workDir };
  }

  async clone(
    handle: WorkspaceHandle,
    repoUrl: string,
    branch: string,
  ): Promise<void> {
    const { simpleGit } = await import('simple-git');
    const git = simpleGit();

    this.logger.debug(`Cloning ${repoUrl}@${branch} → ${handle.workDir}`);
    await git.clone(repoUrl, handle.workDir, [
      '--depth',
      '1',
      '--branch',
      branch,
    ]);
    this.logger.debug(`Clone complete: ${handle.id}`);
  }

  async listFiles(handle: WorkspaceHandle, pattern: string): Promise<string[]> {
    const files = await fg(pattern, {
      cwd: handle.workDir,
      dot: false,
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    return files;
  }

  async readFile(
    handle: WorkspaceHandle,
    filePath: string,
  ): Promise<string | null> {
    const absPath = path.join(handle.workDir, filePath);
    try {
      return await fs.readFile(absPath, 'utf8');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'ENOENT') return null;
      throw err;
    }
  }

  async destroy(handle: WorkspaceHandle): Promise<void> {
    try {
      await fs.rm(handle.workDir, { recursive: true, force: true });
      this.activeDirs.delete(handle.workDir);
      this.logger.debug(`Local workspace removed: ${handle.workDir}`);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to remove workspace ${handle.workDir}: ${String(err)}`,
      );
    }
  }

  /** Remove all surviving temp dirs on server shutdown. */
  async onModuleDestroy(): Promise<void> {
    const dirs = Array.from(this.activeDirs);
    if (dirs.length === 0) return;
    this.logger.warn(
      `Cleaning up ${dirs.length} surviving local workspace(s) on shutdown`,
    );
    await Promise.allSettled(
      dirs.map((workDir) => this.destroy({ id: 'cleanup', workDir })),
    );
  }
}

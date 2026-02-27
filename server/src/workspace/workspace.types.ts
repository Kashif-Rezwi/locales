/**
 * Core types for the workspace abstraction layer.
 * All workspace providers implement WorkspaceProvider.
 * The pipeline uses WorkspaceHandle opaquely — never accesses internals.
 */

/** Opaque handle returned by create(). The pipeline passes it to all subsequent calls. */
export interface WorkspaceHandle {
    /** Unique ID for this workspace (sandbox ID or local temp dir name). */
    id: string;
    /** Absolute path to the directory where the repo is (or will be) cloned. */
    workDir: string;
}

/**
 * WorkspaceProvider — read-only repo access interface.
 *
 * No exec(), no writeFile() — the workspace is purely a read surface.
 * All source transformations (Chunk 9) happen in server memory after readFile().
 */
export interface WorkspaceProvider {
    /** Provider name for logging — "e2b" or "local". */
    readonly name: string;

    /** Returns true if this provider is configured and can create workspaces. */
    isAvailable(): boolean;

    /**
     * Creates an empty workspace environment.
     * Returns a handle that must be passed to all subsequent calls.
     */
    create(): Promise<WorkspaceHandle>;

    /**
     * Performs a shallow, single-branch git clone into the workspace.
     * Uses `--depth 1 --branch {branch}` to minimise clone time and size.
     */
    clone(handle: WorkspaceHandle, repoUrl: string, branch: string): Promise<void>;

    /**
     * Returns all file paths matching a glob pattern, relative to workDir.
     * Example: listFiles(handle, '**\/*.tsx') → ['src/app/page.tsx', 'src/components/Button.tsx']
     */
    listFiles(handle: WorkspaceHandle, pattern: string): Promise<string[]>;

    /**
     * Reads a file as a UTF-8 string.
     * Returns null if the file does not exist (never throws on ENOENT).
     */
    readFile(handle: WorkspaceHandle, filePath: string): Promise<string | null>;

    /**
     * Destroys the workspace and frees all associated resources.
     * Must be called in a finally block — cleanup must always happen.
     */
    destroy(handle: WorkspaceHandle): Promise<void>;
}

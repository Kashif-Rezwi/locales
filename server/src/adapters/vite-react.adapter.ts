import { Injectable, NotImplementedException } from '@nestjs/common';
import type {
    FrameworkAdapter,
    DepsMap,
    DetectionResult,
    ModifiedFile,
    GeneratedFile,
    RuntimeConfig,
    SourceString,
} from './adapter.types';

/**
 * Vite + React adapter.
 *
 * Detection signals:
 *   - `vite` in deps or devDeps (required)
 *   - `react` in deps (required — distinguishes from Vite + Vue/Svelte)
 *   - `vite.config.ts` or `vite.config.js` in file tree
 *   - NOT `next` in deps (would be Next.js)
 *
 * Confidence: 0.95 with vite config; 0.75 if only vite + react in deps.
 */
@Injectable()
export class ViteReactAdapter implements FrameworkAdapter {
    readonly name = 'vite-react';

    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        const hasVite = 'vite' in deps;
        const hasReact = 'react' in deps;
        const hasNext = 'next' in deps;

        if (!hasVite || !hasReact || hasNext) {
            return { name: this.name, confidence: 0 };
        }

        const hasViteConfig = filePaths.some(
            (p) =>
                p === 'vite.config.ts' ||
                p === 'vite.config.js' ||
                p === 'vite.config.mts' ||
                p === 'vite.config.mjs',
        );

        return {
            name: this.name,
            confidence: hasViteConfig ? 0.95 : 0.75,
        };
    }

    getEntryPoint(filePaths: string[]): string | null {
        return (
            filePaths.find(
                (p) =>
                    p === 'src/main.tsx' ||
                    p === 'src/main.jsx' ||
                    p === 'src/index.tsx' ||
                    p === 'src/index.jsx',
            ) ?? null
        );
    }

    async extractStrings(
        _filePaths: string[],
        _readFile: (path: string) => Promise<string>,
    ): Promise<SourceString[]> {
        throw new NotImplementedException('extractStrings — implemented in Chunk 5');
    }

    async applyCodeMod(
        _files: ModifiedFile[],
        _strings: SourceString[],
    ): Promise<ModifiedFile[]> {
        throw new NotImplementedException('applyCodeMod — implemented in Chunk 9');
    }

    generateRuntime(_config: RuntimeConfig, _locales: string[]): GeneratedFile[] {
        throw new NotImplementedException('generateRuntime — implemented in Chunk 9');
    }

    generateRouting(_locales: string[]): GeneratedFile[] {
        throw new NotImplementedException('generateRouting — implemented in Chunk 10');
    }
}

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
 * Next.js Pages Router adapter.
 *
 * Detection signals:
 *   - `next` in deps (required)
 *   - `pages/_app.tsx` or `pages/_app.jsx` present in file tree
 *
 * Confidence: 0.90 with _app file; 0.60 if only `next` in deps.
 * Lower than App Router (0.95) so App Router wins in hybrid repos.
 */
@Injectable()
export class NextjsPagesRouterAdapter implements FrameworkAdapter {
    readonly name = 'nextjs-pages-router';

    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        const hasNext = 'next' in deps;
        if (!hasNext) return { name: this.name, confidence: 0 };

        const hasApp = filePaths.some(
            (p) =>
                p === 'pages/_app.tsx' ||
                p === 'pages/_app.jsx' ||
                p === 'pages/_app.ts' ||
                p === 'pages/_app.js',
        );

        return {
            name: this.name,
            confidence: hasApp ? 0.90 : 0.60,
        };
    }

    getEntryPoint(filePaths: string[]): string | null {
        return (
            filePaths.find(
                (p) =>
                    p === 'pages/_app.tsx' ||
                    p === 'pages/_app.jsx' ||
                    p === 'pages/_app.ts' ||
                    p === 'pages/_app.js',
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

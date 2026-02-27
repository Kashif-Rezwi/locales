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
 * Next.js App Router adapter.
 *
 * Detection signals:
 *   - `next` in deps (required)
 *   - `app/layout.tsx` or `src/app/layout.tsx` present in file tree
 *
 * Confidence: 0.95 with layout file present; 0.75 if only `next` in deps.
 * This beats nextjs-pages-router (0.90) in hybrid repos.
 */
@Injectable()
export class NextjsAppRouterAdapter implements FrameworkAdapter {
    readonly name = 'nextjs-app-router';

    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        const hasNext = 'next' in deps;
        if (!hasNext) return { name: this.name, confidence: 0 };

        const hasAppLayout = filePaths.some(
            (p) =>
                p === 'app/layout.tsx' ||
                p === 'app/layout.jsx' ||
                p === 'src/app/layout.tsx' ||
                p === 'src/app/layout.jsx',
        );

        return {
            name: this.name,
            confidence: hasAppLayout ? 0.95 : 0.75,
        };
    }

    getEntryPoint(filePaths: string[]): string | null {
        return (
            filePaths.find(
                (p) =>
                    p === 'app/layout.tsx' ||
                    p === 'app/layout.jsx' ||
                    p === 'src/app/layout.tsx' ||
                    p === 'src/app/layout.jsx',
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

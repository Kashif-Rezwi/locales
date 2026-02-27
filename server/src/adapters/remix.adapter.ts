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
import { ExtractionService } from '../extraction/extraction.service';

/**
 * Remix adapter.
 *
 * Detection signals:
 *   - `@remix-run/react` in deps (required)
 *   - `app/root.tsx` or `app/root.jsx` in file tree
 *
 * Confidence: 0.95 with root file; 0.80 if only the dep is present.
 */
@Injectable()
export class RemixAdapter implements FrameworkAdapter {
    readonly name = 'remix';

    constructor(private readonly extractionService: ExtractionService) { }

    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        const hasRemix = '@remix-run/react' in deps;
        if (!hasRemix) return { name: this.name, confidence: 0 };

        const hasRoot = filePaths.some(
            (p) =>
                p === 'app/root.tsx' ||
                p === 'app/root.jsx' ||
                p === 'app/root.ts' ||
                p === 'app/root.js',
        );

        return { name: this.name, confidence: hasRoot ? 0.95 : 0.80 };
    }

    getEntryPoint(filePaths: string[]): string | null {
        return (
            filePaths.find(
                (p) =>
                    p === 'app/root.tsx' ||
                    p === 'app/root.jsx' ||
                    p === 'app/root.ts' ||
                    p === 'app/root.js',
            ) ?? null
        );
    }

    async extractStrings(
        filePaths: string[],
        readFile: (path: string) => Promise<string>,
    ): Promise<SourceString[]> {
        return this.extractionService.extractFromFiles(filePaths, readFile);
    }

    async applyCodeMod(_files: ModifiedFile[], _strings: SourceString[]): Promise<ModifiedFile[]> {
        throw new NotImplementedException('applyCodeMod — implemented in Chunk 9');
    }

    generateRuntime(_config: RuntimeConfig, _locales: string[]): GeneratedFile[] {
        throw new NotImplementedException('generateRuntime — implemented in Chunk 9');
    }

    generateRouting(_locales: string[]): GeneratedFile[] {
        throw new NotImplementedException('generateRouting — implemented in Chunk 10');
    }
}

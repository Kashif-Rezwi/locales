import { Injectable } from '@nestjs/common';
import type {
    FrameworkAdapter, DepsMap, DetectionResult,
    ModifiedFile, GeneratedFile, RuntimeConfig, SourceString,
} from './adapter.types';
import { ExtractionService } from '../extraction/extraction.service';
import { CodeModService } from '../code-mod/code-mod.service';
import { RuntimeGeneratorService } from '../code-mod/runtime-generator.service';

/**
 * Next.js Pages Router adapter.
 * Detection: `next` dep + `pages/_app.tsx`. Confidence 0.90.
 * Lower than App Router (0.95) so App Router wins in hybrid repos.
 */
@Injectable()
export class NextjsPagesRouterAdapter implements FrameworkAdapter {
    readonly name = 'nextjs-pages-router';

    constructor(
        private readonly extractionService: ExtractionService,
        private readonly codeModService: CodeModService,
        private readonly runtimeGenerator: RuntimeGeneratorService,
    ) { }

    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        if (!('next' in deps)) return { name: this.name, confidence: 0 };
        const hasApp = filePaths.some(
            (p) => p === 'pages/_app.tsx' || p === 'pages/_app.jsx' ||
                p === 'pages/_app.ts' || p === 'pages/_app.js',
        );
        return { name: this.name, confidence: hasApp ? 0.90 : 0.60 };
    }

    getEntryPoint(filePaths: string[]): string | null {
        return filePaths.find(
            (p) => p === 'pages/_app.tsx' || p === 'pages/_app.jsx' ||
                p === 'pages/_app.ts' || p === 'pages/_app.js',
        ) ?? null;
    }

    async extractStrings(filePaths: string[], readFile: (p: string) => Promise<string>): Promise<SourceString[]> {
        return this.extractionService.extractFromFiles(filePaths, readFile);
    }

    async applyCodeMod(files: ModifiedFile[], strings: SourceString[]): Promise<ModifiedFile[]> {
        const readFile = (path: string): Promise<string | null> => {
            const file = files.find((f) => f.filePath === path);
            return Promise.resolve(file?.content ?? null);
        };
        return this.codeModService.transformFiles(strings, readFile);
    }

    generateRuntime(config: RuntimeConfig, locales: string[]): GeneratedFile[] {
        const results: GeneratedFile[] = [this.runtimeGenerator.generateI18nHelper()];
        const entryPoint = this.getEntryPoint(Object.keys(config as unknown as Record<string, unknown>)) ??
            'pages/_app.tsx';
        results.push(this.runtimeGenerator.generateLayoutPatch(this.name, entryPoint, locales));
        return results;
    }

    generateRouting(_locales: string[]): GeneratedFile[] {
        return []; // Chunk 10
    }
}

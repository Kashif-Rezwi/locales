import { Injectable } from '@nestjs/common';
import type {
    FrameworkAdapter, DepsMap, DetectionResult,
    ModifiedFile, GeneratedFile, RuntimeConfig, SourceString,
} from './adapter.types';
import { ExtractionService } from '../extraction/extraction.service';
import { CodeModService } from '../code-mod/code-mod.service';
import { RuntimeGeneratorService } from '../code-mod/runtime-generator.service';

/**
 * Vite + React adapter.
 * Detection: `vite` dep + `react` dep + vite.config.* + NOT `next`. Confidence 0.95.
 */
@Injectable()
export class ViteReactAdapter implements FrameworkAdapter {
    readonly name = 'vite-react';

    constructor(
        private readonly extractionService: ExtractionService,
        private readonly codeModService: CodeModService,
        private readonly runtimeGenerator: RuntimeGeneratorService,
    ) { }

    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        if (!('vite' in deps) || !('react' in deps) || 'next' in deps) {
            return { name: this.name, confidence: 0 };
        }
        const hasViteConfig = filePaths.some(
            (p) => p === 'vite.config.ts' || p === 'vite.config.js' ||
                p === 'vite.config.mts' || p === 'vite.config.mjs',
        );
        return { name: this.name, confidence: hasViteConfig ? 0.95 : 0.75 };
    }

    getEntryPoint(filePaths: string[]): string | null {
        return filePaths.find(
            (p) => p === 'src/main.tsx' || p === 'src/main.jsx' ||
                p === 'src/index.tsx' || p === 'src/index.jsx',
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
            'src/main.tsx';
        results.push(this.runtimeGenerator.generateLayoutPatch(this.name, entryPoint, locales));
        return results;
    }

    generateRouting(_locales: string[]): GeneratedFile[] {
        return []; // Chunk 10
    }
}

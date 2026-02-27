import { Injectable, NotImplementedException } from '@nestjs/common';
import type {
    FrameworkAdapter, DepsMap, DetectionResult,
    ModifiedFile, GeneratedFile, RuntimeConfig, SourceString,
} from './adapter.types';
import { ExtractionService } from '../extraction/extraction.service';
import { CodeModService } from '../code-mod/code-mod.service';
import { RuntimeGeneratorService } from '../code-mod/runtime-generator.service';

/**
 * Next.js App Router adapter.
 * Detection: `next` dep + `app/layout.tsx` in file tree. Confidence 0.95.
 * Beats Pages Router (0.90) in hybrid repos.
 */
@Injectable()
export class NextjsAppRouterAdapter implements FrameworkAdapter {
    readonly name = 'nextjs-app-router';

    constructor(
        private readonly extractionService: ExtractionService,
        private readonly codeModService: CodeModService,
        private readonly runtimeGenerator: RuntimeGeneratorService,
    ) { }

    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        if (!('next' in deps)) return { name: this.name, confidence: 0 };
        const hasAppLayout = filePaths.some(
            (p) => p === 'app/layout.tsx' || p === 'app/layout.jsx' ||
                p === 'src/app/layout.tsx' || p === 'src/app/layout.jsx',
        );
        return { name: this.name, confidence: hasAppLayout ? 0.95 : 0.75 };
    }

    getEntryPoint(filePaths: string[]): string | null {
        return filePaths.find(
            (p) => p === 'app/layout.tsx' || p === 'app/layout.jsx' ||
                p === 'src/app/layout.tsx' || p === 'src/app/layout.jsx',
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
            'app/layout.tsx';
        results.push(this.runtimeGenerator.generateLayoutPatch(this.name, entryPoint, locales));

        return results;
    }

    generateRouting(_locales: string[]): GeneratedFile[] {
        return []; // Chunk 10
    }
}

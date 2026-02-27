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
import { CodeModService } from '../code-mod/code-mod.service';
import { RuntimeGeneratorService } from '../code-mod/runtime-generator.service';

/**
 * BaseAdapter — shared implementation for all framework adapters.
 *
 * Subclasses only need to implement:
 *   - detect()          — framework-specific detection logic
 *   - getEntryPoint()   — framework-specific entry point resolution
 *   - generateRouting() — framework-specific routing/middleware generation
 *
 * Everything else (extractStrings, applyCodeMod, generateRuntime) is identical
 * across all adapters and lives here to eliminate code duplication.
 */
export abstract class BaseAdapter implements FrameworkAdapter {
  abstract readonly name: string;

  constructor(
    protected readonly extractionService: ExtractionService,
    protected readonly codeModService: CodeModService,
    protected readonly runtimeGenerator: RuntimeGeneratorService,
  ) {}

  /** Framework-specific detection — implemented by each subclass. */
  abstract detect(deps: DepsMap, filePaths: string[]): DetectionResult;

  /** Framework-specific entry point — implemented by each subclass. */
  abstract getEntryPoint(filePaths: string[]): string | null;

  /** Framework-specific routing generation — implemented by each subclass. */
  abstract generateRouting(locales: string[]): GeneratedFile[];

  /** Extracts user-facing strings from source files via the Babel AST pipeline. */
  async extractStrings(
    filePaths: string[],
    readFile: (p: string) => Promise<string>,
  ): Promise<SourceString[]> {
    return this.extractionService.extractFromFiles(filePaths, readFile);
  }

  /** Applies t("hash") Babel code mod to the file set. */
  async applyCodeMod(
    files: ModifiedFile[],
    strings: SourceString[],
  ): Promise<ModifiedFile[]> {
    const readFile = (path: string): Promise<string | null> => {
      const file = files.find((f) => f.filePath === path);
      return Promise.resolve(file?.content ?? null);
    };
    return this.codeModService.transformFiles(strings, readFile);
  }

  /** Generates the i18n runtime helper and layout patch. */
  generateRuntime(config: RuntimeConfig, locales: string[]): GeneratedFile[] {
    const results: GeneratedFile[] = [
      this.runtimeGenerator.generateI18nHelper(),
    ];
    const entryPoint = config.entryPoint || this.getDefaultEntryPoint();
    results.push(
      this.runtimeGenerator.generateLayoutPatch(this.name, entryPoint, locales),
    );
    return results;
  }

  /** Fallback entry point when neither detection nor config provides one. */
  protected abstract getDefaultEntryPoint(): string;
}

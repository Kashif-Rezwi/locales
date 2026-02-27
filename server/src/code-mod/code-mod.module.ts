import { Module } from '@nestjs/common';
import { CodeModService } from './code-mod.service';
import { RuntimeGeneratorService } from './runtime-generator.service';

/**
 * CodeModModule — provides both passes of the source transformation pipeline.
 *
 * Pass 1: CodeModService     — Babel AST in-memory string → t(hash) transform
 * Pass 2: RuntimeGeneratorService — generates lib/i18n.ts, locale JSONs, layout patches
 *
 * Exported for use by adapters (via AdaptersModule) and the pipeline (Chunk 12).
 */
@Module({
  providers: [CodeModService, RuntimeGeneratorService],
  exports: [CodeModService, RuntimeGeneratorService],
})
export class CodeModModule {}

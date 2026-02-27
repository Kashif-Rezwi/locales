import { Module } from '@nestjs/common';
import { ExtractionService } from './extraction.service';

/**
 * ExtractionModule — provides ExtractionService for Babel AST string extraction.
 * Imported by AdaptersModule so each adapter can inject ExtractionService.
 */
@Module({
  providers: [ExtractionService],
  exports: [ExtractionService],
})
export class ExtractionModule {}

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { FrameworkAdapter, DepsMap, DetectionResult } from './adapter.types';
import { UnsupportedFrameworkException } from './exceptions/unsupported-framework.exception';

/** Minimum confidence for an adapter to qualify during detection. */
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * AdapterRegistryService — the central plugin registry for framework adapters.
 *
 * Adapters register themselves by calling register() in their module's onModuleInit.
 * Detection runs all adapters and returns the highest-confidence match.
 */
@Injectable()
export class AdapterRegistryService {
    private readonly logger = new Logger(AdapterRegistryService.name);
    private readonly adapters = new Map<string, FrameworkAdapter>();

    /**
     * Registers a framework adapter.
     * @throws Error if an adapter with the same name is already registered.
     */
    register(adapter: FrameworkAdapter): void {
        if (this.adapters.has(adapter.name)) {
            throw new Error(
                `Adapter "${adapter.name}" is already registered. Duplicate adapter names are not allowed.`,
            );
        }
        this.adapters.set(adapter.name, adapter);
        this.logger.log(`Registered adapter: ${adapter.name}`);
    }

    /**
     * Detects the framework from a parsed package.json deps map and a list of file paths.
     * Runs all registered adapters and returns the one with the highest confidence.
     *
     * @throws UnsupportedFrameworkException if no adapter reaches the confidence threshold.
     */
    detect(deps: DepsMap, filePaths: string[]): DetectionResult {
        const results: DetectionResult[] = [];

        for (const adapter of this.adapters.values()) {
            const result = adapter.detect(deps, filePaths);
            if (result.confidence >= CONFIDENCE_THRESHOLD) {
                results.push(result);
            }
        }

        if (results.length === 0) {
            throw new UnsupportedFrameworkException({
                detectedDeps: Object.keys(deps).slice(0, 20),
                fileCount: filePaths.length,
            });
        }

        // Highest confidence wins; if tied, registry insertion order decides
        results.sort((a, b) => b.confidence - a.confidence);
        const winner = results[0];
        this.logger.debug(`Detected framework: ${winner.name} (confidence: ${winner.confidence})`);
        return winner;
    }

    /**
     * Returns the adapter for a given framework name.
     * @throws NotFoundException if no adapter with that name is registered.
     */
    getByName(name: string): FrameworkAdapter {
        const adapter = this.adapters.get(name);
        if (!adapter) {
            throw new NotFoundException(`No adapter registered for framework: "${name}"`);
        }
        return adapter;
    }

    /** Returns the names of all registered adapters in registration order. */
    listAll(): string[] {
        return Array.from(this.adapters.keys());
    }
}

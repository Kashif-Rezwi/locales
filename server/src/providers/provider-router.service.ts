import { Injectable, Logger } from '@nestjs/common';
import type { TranslationProvider, TranslateRequest, TranslateResponse } from './provider.types';
import { ProviderError, ProviderErrorType } from './provider.types';

/** Maximum strings per batch call to any provider. */
const BATCH_CHUNK_SIZE = 50;
/** Maximum retry attempts per provider per request. */
const MAX_RETRIES = 3;
/** Exponential backoff delays in ms: attempt 0→500ms, 1→1000ms, 2→2000ms. */
const BACKOFF_MS = [500, 1000, 2000];
/** Returned when every provider fails for a string. */
const FAILED_RESULT = (text: string): TranslateResponse => ({
    translatedText: '',
    provider: 'none',
    confidence: 0,
});

/**
 * ProviderRouterService — orchestrates translation across the provider chain.
 *
 * Responsibilities:
 *   - Maintain a priority-ordered list of available providers
 *   - Retry retryable errors with exponential backoff
 *   - Fall back to the next provider on fatal errors
 *   - Chunk large batches into groups of 50 before dispatching
 *   - Return a zero-confidence result (not throw) when all providers fail
 */
@Injectable()
export class ProviderRouterService {
    private readonly logger = new Logger(ProviderRouterService.name);
    private readonly providers: TranslationProvider[] = [];

    /**
     * Registers an available provider in the priority chain.
     * Providers are tried in registration order — register in priority order.
     */
    register(provider: TranslationProvider): void {
        if (!provider.isAvailable()) {
            this.logger.log(`Provider "${provider.name}" skipped (not configured)`);
            return;
        }
        this.providers.push(provider);
        this.logger.log(`Registered provider: ${provider.name}`);
    }

    /** Returns all active (registered & available) provider names. */
    listAll(): string[] {
        return this.providers.map((p) => p.name);
    }

    /**
     * Translates a single string, trying each provider in order.
     * Returns a failed result if all providers fail.
     */
    async translate(request: TranslateRequest): Promise<TranslateResponse> {
        for (const provider of this.providers) {
            const result = await this.tryWithRetry(provider, request);
            if (result !== null) return result;
        }

        this.logger.warn(`All providers failed for: "${request.text.slice(0, 40)}"`);
        return FAILED_RESULT(request.text);
    }

    /**
     * Translates a batch of strings, chunked to BATCH_CHUNK_SIZE per API call.
     * Results preserve the order of the input array.
     */
    async batchTranslate(requests: TranslateRequest[]): Promise<TranslateResponse[]> {
        const results: TranslateResponse[] = [];

        for (let i = 0; i < requests.length; i += BATCH_CHUNK_SIZE) {
            const chunk = requests.slice(i, i + BATCH_CHUNK_SIZE);
            const chunkResults = await this.translateChunk(chunk);
            results.push(...chunkResults);
        }

        return results;
    }

    /** Translates one chunk (≤50 strings) via the provider chain. */
    private async translateChunk(chunk: TranslateRequest[]): Promise<TranslateResponse[]> {
        for (const provider of this.providers) {
            try {
                const results = await provider.batchTranslate(chunk);

                // Guard: provider returned fewer results than requested
                if (results.length < chunk.length) {
                    this.logger.warn(
                        `${provider.name} returned ${results.length} of ${chunk.length} translations — padding with failures`,
                    );
                    while (results.length < chunk.length) {
                        results.push(FAILED_RESULT(chunk[results.length].text));
                    }
                }

                // Guard: empty strings treated as failures (fall through to next provider would break batch)
                const hasEmpty = results.some((r) => !r.translatedText);
                if (hasEmpty) {
                    this.logger.warn(`${provider.name} returned empty translations — trying next provider`);
                    continue;
                }

                return results;
            } catch (err: unknown) {
                if (err instanceof ProviderError && err.type === ProviderErrorType.Fatal) {
                    this.logger.warn(`${provider.name} fatal error (batch) — skipping: ${err.message}`);
                    continue;
                }
                this.logger.warn(`${provider.name} batch error — skipping: ${String(err)}`);
                continue;
            }
        }

        // All providers failed — return a failed result for each string in the chunk
        return chunk.map((r) => FAILED_RESULT(r.text));
    }

    /**
     * Attempts to translate a single request with one provider.
     * Retries on retryable errors with exponential backoff.
     * Returns null if the provider fails fatally or exhausts retries.
     */
    private async tryWithRetry(
        provider: TranslationProvider,
        request: TranslateRequest,
    ): Promise<TranslateResponse | null> {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const result = await provider.translate(request);

                // Empty translation = treat as failure
                if (!result.translatedText) {
                    this.logger.warn(`${provider.name} returned empty string — skipping`);
                    return null;
                }

                return result;
            } catch (err: unknown) {
                if (err instanceof ProviderError) {
                    if (err.type === ProviderErrorType.Fatal) {
                        this.logger.warn(`${provider.name} fatal error — skipping: ${err.message}`);
                        return null;
                    }
                    // Retryable — back off and retry
                    const delay = BACKOFF_MS[attempt] ?? 2000;
                    this.logger.debug(`${provider.name} retryable error (attempt ${attempt + 1}) — retrying in ${delay}ms`);
                    await sleep(delay);
                } else {
                    // Unknown error — treat as retryable
                    const delay = BACKOFF_MS[attempt] ?? 2000;
                    this.logger.warn(`${provider.name} unknown error — retrying in ${delay}ms: ${String(err)}`);
                    await sleep(delay);
                }
            }
        }

        this.logger.warn(`${provider.name} exhausted retries — skipping`);
        return null;
    }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

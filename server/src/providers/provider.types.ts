/**
 * Core types for the Translation Provider system.
 * All concrete providers and the router operate on these contracts.
 */

/** A single translation request — one string, one target locale. */
export interface TranslateRequest {
    text: string;
    sourceLocale: string;
    targetLocale: string;
}

/** Result of a single translation, including which provider handled it. */
export interface TranslateResponse {
    translatedText: string;
    /** Name of the provider that produced this result (or "none" on total failure). */
    provider: string;
    /** Heuristic confidence 0.0–1.0 — Chunk 7 (TM engine) fills this. */
    confidence: number;
}

/** Estimated cost for a batch of words. */
export interface CostEstimate {
    provider: string;
    estimatedCostUsd: number;
}

/**
 * TranslationProvider — the contract every concrete provider must satisfy.
 *
 * Providers are stateless services. The router owns retry and fallback logic.
 * Providers only need to make the API call and throw on failure.
 */
export interface TranslationProvider {
    /** Unique provider identifier, e.g. "deepl", "openai". */
    readonly name: string;

    /**
     * Returns true if this provider is configured and can accept requests.
     * Providers with missing API keys must return false — they are silently
     * excluded from the active chain in ProvidersModule.onModuleInit.
     */
    isAvailable(): boolean;

    /** Translates a single string. Throws on any API error. */
    translate(request: TranslateRequest): Promise<TranslateResponse>;

    /**
     * Translates a batch of strings.
     * The router handles chunking to 50 strings max before calling this.
     * Default implementation: sequential single-string calls.
     */
    batchTranslate(requests: TranslateRequest[]): Promise<TranslateResponse[]>;

    /** Returns a rough cost estimate for the given character/word count. */
    estimateCost(wordCount: number, targetLocale: string): CostEstimate;
}

/** Error category for retry/fallback decisions in the router. */
export enum ProviderErrorType {
    /** Retryable: 429 rate limit, 5xx server errors, network timeout. */
    Retryable = 'RETRYABLE',
    /** Fatal: 401/403 auth failure, 422 unsupported language pair. */
    Fatal = 'FATAL',
}

/** Thrown by providers to communicate error category to the router. */
export class ProviderError extends Error {
    constructor(
        message: string,
        public readonly type: ProviderErrorType,
        public readonly statusCode?: number,
    ) {
        super(message);
        this.name = 'ProviderError';
    }
}

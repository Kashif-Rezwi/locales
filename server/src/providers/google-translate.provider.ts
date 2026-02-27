import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TranslationProvider, TranslateRequest, TranslateResponse, CostEstimate } from './provider.types';
import { ProviderError, ProviderErrorType } from './provider.types';

const GOOGLE_API = 'https://translation.googleapis.com/language/translate/v2';

@Injectable()
export class GoogleTranslateProvider implements TranslationProvider {
    readonly name = 'google-translate';
    private readonly logger = new Logger(GoogleTranslateProvider.name);
    private readonly apiKey: string | undefined;

    constructor(private readonly config: ConfigService) {
        this.apiKey = config.get<string>('GOOGLE_TRANSLATE_API_KEY');
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async translate(request: TranslateRequest): Promise<TranslateResponse> {
        const [result] = await this.batchTranslate([request]);
        return result;
    }

    async batchTranslate(requests: TranslateRequest[]): Promise<TranslateResponse[]> {
        if (requests.length === 0) return [];

        const params = new URLSearchParams({ key: this.apiKey! });
        const body: Record<string, unknown> = {
            q: requests.map((r) => r.text),
            source: requests[0].sourceLocale.split('-')[0],
            target: requests[0].targetLocale.split('-')[0],
            format: 'text',
        };

        let res: Response;
        try {
            res = await fetch(`${GOOGLE_API}?${params}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(10_000),
            });
        } catch (err: unknown) {
            throw new ProviderError(`Google network error: ${String(err)}`, ProviderErrorType.Retryable);
        }

        if (res.status === 429 || res.status >= 500) {
            throw new ProviderError(`Google ${res.status}`, ProviderErrorType.Retryable, res.status);
        }
        if (res.status === 400 || res.status === 401 || res.status === 403) {
            throw new ProviderError(`Google auth/param error ${res.status}`, ProviderErrorType.Fatal, res.status);
        }
        if (!res.ok) {
            throw new ProviderError(`Google error ${res.status}`, ProviderErrorType.Fatal, res.status);
        }

        const data = (await res.json()) as { data: { translations: Array<{ translatedText: string }> } };
        return data.data.translations.map((t) => ({
            translatedText: t.translatedText,
            provider: this.name,
            confidence: 0.85,
        }));
    }

    estimateCost(wordCount: number, _targetLocale: string): CostEstimate {
        // Google charges $20/1M chars; ~5 chars/word
        return { provider: this.name, estimatedCostUsd: wordCount * 5 * 0.00002 };
    }
}

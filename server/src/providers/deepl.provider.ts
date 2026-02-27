import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TranslationProvider, TranslateRequest, TranslateResponse, CostEstimate } from './provider.types';
import { ProviderError, ProviderErrorType } from './provider.types';

const DEEPL_API = 'https://api-free.deepl.com/v2/translate';
/** DeepL locale code mapping — DeepL uses e.g. "EN" not "en", "PT-BR" not "pt-BR". */
const toDeepLLocale = (locale: string): string => locale.toUpperCase().replace('_', '-');

@Injectable()
export class DeepLProvider implements TranslationProvider {
    readonly name = 'deepl';
    private readonly logger = new Logger(DeepLProvider.name);
    private readonly apiKey: string | undefined;

    constructor(private readonly config: ConfigService) {
        this.apiKey = config.get<string>('DEEPL_API_KEY');
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

        const body = new URLSearchParams();
        for (const r of requests) body.append('text', r.text);
        body.set('source_lang', toDeepLLocale(requests[0].sourceLocale).split('-')[0]);
        body.set('target_lang', toDeepLLocale(requests[0].targetLocale));

        let res: Response;
        try {
            res = await fetch(DEEPL_API, {
                method: 'POST',
                headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}` },
                body,
                signal: AbortSignal.timeout(10_000),
            });
        } catch (err: unknown) {
            throw new ProviderError(`DeepL network error: ${String(err)}`, ProviderErrorType.Retryable);
        }

        if (res.status === 429 || res.status >= 500) {
            throw new ProviderError(`DeepL ${res.status}`, ProviderErrorType.Retryable, res.status);
        }
        if (res.status === 401 || res.status === 403) {
            throw new ProviderError(`DeepL auth failure ${res.status}`, ProviderErrorType.Fatal, res.status);
        }
        if (!res.ok) {
            throw new ProviderError(`DeepL error ${res.status}`, ProviderErrorType.Fatal, res.status);
        }

        const data = (await res.json()) as { translations: Array<{ text: string }> };
        return data.translations.map((t, i) => ({
            translatedText: t.text,
            provider: this.name,
            confidence: requests[i] ? 0.9 : 0.9,
        }));
    }

    estimateCost(wordCount: number, _targetLocale: string): CostEstimate {
        // DeepL charges per character; ~5 chars/word average, $20/1M chars
        return { provider: this.name, estimatedCostUsd: wordCount * 5 * 0.00002 };
    }
}

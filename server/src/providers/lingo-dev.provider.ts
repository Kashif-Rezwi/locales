import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TranslationProvider, TranslateRequest, TranslateResponse, CostEstimate } from './provider.types';
import { ProviderError, ProviderErrorType } from './provider.types';

const LINGO_API = 'https://api.lingo.dev/v1/translate';

@Injectable()
export class LingoDevProvider implements TranslationProvider {
    readonly name = 'lingo-dev';
    private readonly logger = new Logger(LingoDevProvider.name);
    private readonly apiKey: string | undefined;

    constructor(private readonly config: ConfigService) {
        this.apiKey = config.get<string>('LINGO_API_KEY');
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async translate(request: TranslateRequest): Promise<TranslateResponse> {
        let res: Response;
        try {
            res = await fetch(LINGO_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    text: request.text,
                    source: request.sourceLocale,
                    target: request.targetLocale,
                }),
                signal: AbortSignal.timeout(10_000),
            });
        } catch (err: unknown) {
            throw new ProviderError(`Lingo.dev network error: ${String(err)}`, ProviderErrorType.Retryable);
        }

        if (res.status === 429 || res.status >= 500) {
            throw new ProviderError(`Lingo.dev ${res.status}`, ProviderErrorType.Retryable, res.status);
        }
        if (res.status === 401 || res.status === 403) {
            throw new ProviderError(`Lingo.dev auth failure ${res.status}`, ProviderErrorType.Fatal, res.status);
        }
        if (!res.ok) {
            throw new ProviderError(`Lingo.dev error ${res.status}`, ProviderErrorType.Fatal, res.status);
        }

        const data = (await res.json()) as { translatedText?: string; translation?: string };
        const translatedText = data.translatedText ?? data.translation ?? '';

        if (!translatedText) {
            throw new ProviderError('Lingo.dev returned empty translation', ProviderErrorType.Fatal);
        }

        return { translatedText, provider: this.name, confidence: 0.9 };
    }

    async batchTranslate(requests: TranslateRequest[]): Promise<TranslateResponse[]> {
        // Lingo.dev API is single-string — sequential calls
        return Promise.all(requests.map((r) => this.translate(r)));
    }

    estimateCost(_wordCount: number, _targetLocale: string): CostEstimate {
        return { provider: this.name, estimatedCostUsd: 0 };
    }
}

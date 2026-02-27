import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TranslationProvider,
  TranslateRequest,
  TranslateResponse,
  CostEstimate,
} from './provider.types';
import { ProviderError, ProviderErrorType } from './provider.types';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
/** Max strings per GPT request — higher risks context length limits. */
const GPT_BATCH_SIZE = 10;

@Injectable()
export class OpenAIProvider implements TranslationProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('OPENAI_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const [result] = await this.batchTranslate([request]);
    return result;
  }

  async batchTranslate(
    requests: TranslateRequest[],
  ): Promise<TranslateResponse[]> {
    if (requests.length === 0) return [];

    const results: TranslateResponse[] = [];

    // Process in sub-batches of GPT_BATCH_SIZE
    for (let i = 0; i < requests.length; i += GPT_BATCH_SIZE) {
      const chunk = requests.slice(i, i + GPT_BATCH_SIZE);
      const chunkResults = await this.translateChunk(chunk);
      results.push(...chunkResults);
    }

    return results;
  }

  private async translateChunk(
    requests: TranslateRequest[],
  ): Promise<TranslateResponse[]> {
    const { sourceLocale, targetLocale } = requests[0];

    const userMessage =
      `Translate the following ${requests.length} strings from "${sourceLocale}" to "${targetLocale}".\n` +
      `Return ONLY a JSON array of translated strings in the same order, no explanation.\n\n` +
      `Strings to translate:\n${JSON.stringify(requests.map((r) => r.text))}`;

    let res: Response;
    try {
      res = await fetch(OPENAI_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional translator. Return only valid JSON arrays.',
            },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err: unknown) {
      throw new ProviderError(
        `OpenAI network error: ${String(err)}`,
        ProviderErrorType.Retryable,
      );
    }

    if (res.status === 429 || res.status >= 500) {
      throw new ProviderError(
        `OpenAI ${res.status}`,
        ProviderErrorType.Retryable,
        res.status,
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new ProviderError(
        `OpenAI auth failure ${res.status}`,
        ProviderErrorType.Fatal,
        res.status,
      );
    }
    if (!res.ok) {
      throw new ProviderError(
        `OpenAI error ${res.status}`,
        ProviderErrorType.Fatal,
        res.status,
      );
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content?.trim() ?? '[]';

    let translations: string[];
    try {
      translations = JSON.parse(content) as string[];
    } catch {
      throw new ProviderError(
        'OpenAI returned invalid JSON',
        ProviderErrorType.Fatal,
      );
    }

    return requests.map((r, idx) => ({
      translatedText: translations[idx] ?? '',
      provider: this.name,
      confidence: 0.88,
    }));
  }

  estimateCost(wordCount: number, _targetLocale: string): CostEstimate {
    // gpt-4o-mini: ~$0.15/1M input tokens; ~1.3 tokens/word
    return {
      provider: this.name,
      estimatedCostUsd: wordCount * 1.3 * 0.00000015,
    };
  }
}

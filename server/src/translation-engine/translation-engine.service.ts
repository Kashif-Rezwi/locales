import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ProviderRouterService } from '../providers/provider-router.service';

/** Normalise a string before hashing — must match ExtractionService.hashString(). */
const normalise = (text: string) => text.trim().normalize('NFC');
const hashText = (text: string) =>
  createHash('sha256').update(normalise(text)).digest('hex');

/** Input to translateBatch(). Hash is pre-computed by the caller (from SourceString). */
export interface TranslationInput {
  text: string;
  hash: string; // SHA-256 of normalised text — must match TM key
}

/** Single translation result returned per input string. */
export interface TranslationResult {
  text: string;
  hash: string;
  translatedText: string;
  provider: string;
  confidence: number;
  fromCache: boolean; // true if served from TM
}

/** Aggregate metrics for the batch — consumed by the pipeline for job logs. */
export interface BatchMetrics {
  totalStrings: number;
  tmHits: number;
  tmMisses: number;
  providerCalls: number;
  providers: string[];
  estimatedCostUsd: number;
}

/**
 * Heuristic confidence scorer — zero API cost.
 *
 * Rules (evaluated in order, first match wins):
 *   1. Empty translation → 0.0
 *   2. Source === translation (no-op, untranslated) → 0.0
 *   3. Length ratio out of 0.3–3.5 range → 0.3 (truncated or repeated)
 *   4. Otherwise → inherit provider's confidence value
 */
function scoreConfidence(
  source: string,
  translation: string,
  providerConfidence: number,
): number {
  if (!translation) return 0;
  if (source.trim() === translation.trim()) return 0;

  const srcLen = source.length;
  const tgtLen = translation.length;
  const ratio = srcLen === 0 ? 1 : tgtLen / srcLen;
  if (ratio < 0.3 || ratio > 3.5) return 0.3;

  return providerConfidence;
}

/**
 * TranslationEngineService — the TM-augmented translation pipeline.
 *
 * Flow per batch:
 *   1. One DB query: fetch all TM hits for the input hash set
 *   2. TM hits  → increment usageCount, return cached translation
 *   3. TM misses → ProviderRouterService.translate(), score confidence, upsert to TM
 *   4. Return ordered TranslationResult[] + BatchMetrics
 */
@Injectable()
export class TranslationEngineService {
  private readonly logger = new Logger(TranslationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly router: ProviderRouterService,
  ) {}

  /**
   * Translates a batch of strings for a user, leveraging the TM cache.
   * Returns results in the same order as the input array.
   */
  async translateBatch(
    inputs: TranslationInput[],
    sourceLocale: string,
    targetLocale: string,
    userId: string,
  ): Promise<{ results: TranslationResult[]; metrics: BatchMetrics }> {
    if (inputs.length === 0) {
      return {
        results: [],
        metrics: {
          totalStrings: 0,
          tmHits: 0,
          tmMisses: 0,
          providerCalls: 0,
          providers: [],
          estimatedCostUsd: 0,
        },
      };
    }

    const hashes = inputs.map((i) => i.hash);

    // ── 1. Batch TM lookup ──────────────────────────────────────────────────
    const tmEntries = await this.prisma.translationMemory.findMany({
      where: { userId, hash: { in: hashes }, sourceLocale, targetLocale },
    });
    const tmMap = new Map(tmEntries.map((e) => [e.hash, e]));

    // ── 2. Partition hits vs misses ─────────────────────────────────────────
    const hits: TranslationInput[] = [];
    const misses: TranslationInput[] = [];
    for (const input of inputs) {
      if (tmMap.has(input.hash)) hits.push(input);
      else misses.push(input);
    }

    this.logger.debug(
      `TM: ${hits.length} hits / ${misses.length} misses (${inputs.length} total) [${sourceLocale}→${targetLocale}]`,
    );

    // ── 3. Increment usageCount for all TM hits (fire-and-forget) ──────────
    if (hits.length > 0) {
      const hitIds = hits.map((h) => tmMap.get(h.hash)!.id);
      this.prisma.translationMemory
        .updateMany({
          where: { id: { in: hitIds } },
          data: { usageCount: { increment: 1 } },
        })
        .catch((err: unknown) =>
          this.logger.warn(`TM usageCount update failed: ${String(err)}`),
        );
    }

    // ── 4. Translate TM misses via provider router ──────────────────────────
    const providersUsed = new Set<string>();
    let totalCost = 0;

    const missResults = new Map<string, TranslationResult>();
    if (misses.length > 0) {
      const providerResponses = await this.router.batchTranslate(
        misses.map((m) => ({ text: m.text, sourceLocale, targetLocale })),
      );

      // Estimate cost from provider word counts
      const totalWords = misses.reduce(
        (sum, m) => sum + m.text.split(/\s+/).length,
        0,
      );

      // Upsert each successful translation to TM
      const upserts: Promise<unknown>[] = [];
      for (let i = 0; i < misses.length; i++) {
        const miss = misses[i];
        const resp = providerResponses[i];
        const confidence = scoreConfidence(
          miss.text,
          resp.translatedText,
          resp.confidence,
        );

        missResults.set(miss.hash, {
          text: miss.text,
          hash: miss.hash,
          translatedText: resp.translatedText,
          provider: resp.provider,
          confidence,
          fromCache: false,
        });

        if (resp.translatedText && resp.provider !== 'none') {
          providersUsed.add(resp.provider);
          upserts.push(
            this.prisma.translationMemory.upsert({
              where: {
                userId_hash_sourceLocale_targetLocale: {
                  userId,
                  hash: miss.hash,
                  sourceLocale,
                  targetLocale,
                },
              },
              create: {
                userId,
                hash: miss.hash,
                sourceText: miss.text,
                sourceLocale,
                targetLocale,
                translatedText: resp.translatedText,
                provider: resp.provider,
                confidence,
                usageCount: 1,
              },
              update: {
                translatedText: resp.translatedText,
                provider: resp.provider,
                confidence,
                usageCount: { increment: 1 },
              },
            }),
          );
        }
      }

      // Estimate cost based on primary provider used
      const primaryProvider = providersUsed.values().next().value as
        | string
        | undefined;
      if (primaryProvider) {
        totalCost += this.router.estimateCost(
          primaryProvider,
          totalWords,
          targetLocale,
        );
      }

      // Await TM upserts — data consistency is more important than marginal latency
      try {
        await Promise.all(upserts);
      } catch (err: unknown) {
        this.logger.warn(`TM upsert batch partially failed: ${String(err)}`);
      }
    }

    // ── 5. Assemble ordered results ─────────────────────────────────────────
    const results: TranslationResult[] = inputs.map((input) => {
      const cached = tmMap.get(input.hash);
      if (cached) {
        return {
          text: input.text,
          hash: input.hash,
          translatedText: cached.translatedText,
          provider: cached.provider,
          confidence: cached.confidence,
          fromCache: true,
        };
      }
      return (
        missResults.get(input.hash) ?? {
          text: input.text,
          hash: input.hash,
          translatedText: '',
          provider: 'none',
          confidence: 0,
          fromCache: false,
        }
      );
    });

    const metrics: BatchMetrics = {
      totalStrings: inputs.length,
      tmHits: hits.length,
      tmMisses: misses.length,
      providerCalls: misses.length,
      providers: Array.from(providersUsed),
      estimatedCostUsd: totalCost,
    };

    this.logger.log(
      `Batch complete: ${metrics.tmHits} TM hits, ${metrics.tmMisses} provider calls, ` +
        `providers: [${metrics.providers.join(', ') || 'none'}]`,
    );

    return { results, metrics };
  }

  /**
   * Convenience method for translating a single string.
   * Uses the same TM pipeline as translateBatch.
   */
  async translateOne(
    text: string,
    sourceLocale: string,
    targetLocale: string,
    userId: string,
  ): Promise<TranslationResult> {
    const hash = hashText(text);
    const { results } = await this.translateBatch(
      [{ text, hash }],
      sourceLocale,
      targetLocale,
      userId,
    );
    return results[0];
  }
}

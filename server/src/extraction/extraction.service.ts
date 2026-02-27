import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as babelParser from '@babel/parser';
import babelTraverse from '@babel/traverse';
import type { SourceString } from '../adapters/adapter.types';

/** JSX attributes that carry user-facing text and should be extracted. */
const TRANSLATABLE_ATTRS = new Set([
  'placeholder',
  'alt',
  'title',
  'aria-label',
  'aria-placeholder',
  'aria-description',
  'label',
  'content',
]);

/** Strings that are code directives, not user-facing text. */
const CODE_KEYWORDS = new Set([
  'use client',
  'use server',
  'use strict',
  'import',
  'export',
  'const',
  'let',
  'var',
  'function',
  'return',
  'class',
  'type',
  'interface',
  'from',
  'if',
  'else',
  'switch',
  'case',
  'default',
]);

/**
 * Returns true if the given string is a user-facing translatable string.
 * Applying this filter before hashing prevents junk strings from entering the pipeline.
 */
function isTranslatable(raw: string, isJSX = false): boolean {
  const s = raw.trim();

  // Trivial rejections
  if (!s || s.length < 2 || s.length > 500) return false;
  if (!/[a-zA-Z]/.test(s)) return false; // must contain at least one letter

  // Starts with code/markup characters
  if (/^[{}=<>\\/]/.test(s)) return false;

  // Comment prefix
  if (s.startsWith('//') || s.startsWith('/*') || s.startsWith('#'))
    return false;

  // URLs (http, https, mailto, ftp, etc.)
  if (/^\w+:\/\//.test(s)) return false;

  // Code keyword literals
  if (CODE_KEYWORDS.has(s)) return false;

  // Contains code-like characters — likely an expression fragment
  if (/[{}();=]/.test(s)) return false;

  // Import path: starts with './' or '../' or '@/'
  if (/^\.{0,2}\//.test(s) || s.startsWith('@/')) return false;

  // Single-word token checks
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(s)) {
    if (/^[a-z]+[A-Z]/.test(s)) return false; // camelCase
    if (/^[A-Z_]{2,}$/.test(s) && s.length < 15) return false; // CONSTANT_CASE
    if (isJSX) return s.length >= 2; // short JSX words like "Submit" are valid
    if (s.length < 20) return false; // non-JSX single word must be long
  }

  // CSS class-like: kebab-case token
  if (/^[a-z]+(-[a-z0-9]+)+$/.test(s)) return false;

  // Tailwind / CSS class strings: multiple lowercase tokens separated by spaces
  const words = s.split(/\s+/);
  if (words.length > 1 && words.every((w) => /^[a-z][a-z0-9_:-]*$/.test(w)))
    return false;

  return true;
}

/**
 * SHA-256 hash of trimmed, NFC-normalised text.
 * Identical strings in different files produce the same hash for deduplication.
 */
function hashString(text: string): string {
  return createHash('sha256')
    .update(text.trim().normalize('NFC'))
    .digest('hex');
}

/**
 * Regex fallback extractor for files that Babel fails to parse.
 * Runs 5 patterns targeting the most common user-facing string locations.
 */
function regexFallback(code: string, filePath: string): SourceString[] {
  const results: SourceString[] = [];
  const seen = new Set<string>();

  const patterns: Array<[RegExp, string]> = [
    [/>([^<>{}\n]{2,100})</g, 'JSXText'],
    [/placeholder="([^"]{2,150})"/g, 'JSXAttribute'],
    [/alt="([^"]{2,150})"/g, 'JSXAttribute'],
    [/title="([^"]{2,150})"/g, 'JSXAttribute'],
    [/aria-label="([^"]{2,150})"/g, 'JSXAttribute'],
  ];

  for (const [pattern, nodeType] of patterns) {
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(code)) !== null) {
      const text = match[1].trim();
      if (!isTranslatable(text, nodeType === 'JSXText')) continue;
      const hash = hashString(text);
      if (seen.has(hash)) continue;
      seen.add(hash);
      results.push({
        hash,
        sourceText: text,
        filePath,
        nodeType,
        context: 'regex-fallback',
      });
    }
  }

  return results;
}

/**
 * ExtractionService — production-grade Babel AST string extractor.
 *
 * Processes one file at a time (streaming) so memory usage stays flat even
 * for large repos. Deduplicates across files using a hash map.
 */
@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  /**
   * Extracts all translatable strings from the given file paths.
   *
   * @param filePaths - List of .tsx/.jsx paths relative to the repo root.
   * @param readFile  - Function to read a file's content by path.
   * @returns Deduplicated array of SourceStrings, one per unique string text.
   */
  async extractFromFiles(
    filePaths: string[],
    readFile: (path: string) => Promise<string>,
  ): Promise<SourceString[]> {
    // Only process JSX/TSX files
    const jsxFiles = filePaths.filter((p) => /\.(tsx|jsx)$/.test(p));

    // Accumulator: hash → SourceString (first occurrence wins for deduplication)
    const seen = new Map<string, SourceString>();

    for (const filePath of jsxFiles) {
      let code: string;
      try {
        code = await readFile(filePath);
      } catch {
        this.logger.warn(`Could not read file: ${filePath}`);
        continue;
      }

      const fileStrings = this.extractFromCode(code, filePath);
      for (const s of fileStrings) {
        if (!seen.has(s.hash)) {
          seen.set(s.hash, s);
        }
      }
    }

    const results = Array.from(seen.values());
    this.logger.debug(
      `Extracted ${results.length} unique strings from ${jsxFiles.length} files`,
    );
    return results;
  }

  /**
   * Extracts strings from a single file's source code.
   * Falls back to regex patterns if Babel fails to parse the file.
   */
  private extractFromCode(code: string, filePath: string): SourceString[] {
    try {
      return this.extractWithBabel(code, filePath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Babel failed on ${filePath} (${message}) — using regex fallback`,
      );
      return regexFallback(code, filePath);
    }
  }

  /** Full Babel AST traversal for a single file. */
  private extractWithBabel(code: string, filePath: string): SourceString[] {
    const ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
      errorRecovery: true, // continue past syntax errors where possible
    });

    const results: SourceString[] = [];

    const traverse =
      (babelTraverse as unknown as { default: typeof babelTraverse }).default ??
      babelTraverse;

    traverse(ast, {
      /** Plain text inside JSX elements: <h1>Welcome</h1> → "Welcome" */
      JSXText(path) {
        const text = path.node.value.replace(/\s+/g, ' ').trim();
        if (!isTranslatable(text, true)) return;
        results.push({
          hash: hashString(text),
          sourceText: text,
          filePath,
          nodeType: 'JSXText',
          context: 'JSXText',
        });
      },

      StringLiteral(path) {
        const text = path.node.value.trim();
        const parent = path.parent;

        /** placeholder="Email address" or alt="Logo" etc. */
        if (parent.type === 'JSXAttribute') {
          const attrName = (parent as { name?: { name?: string } }).name?.name;
          if (
            typeof attrName === 'string' &&
            TRANSLATABLE_ATTRS.has(attrName)
          ) {
            if (!isTranslatable(text, true)) return;
            results.push({
              hash: hashString(text),
              sourceText: text,
              filePath,
              nodeType: 'JSXAttribute',
              context: attrName,
            });
          }
          // Any JSX attribute with multi-word user-facing text
          if (
            typeof attrName === 'string' &&
            !TRANSLATABLE_ATTRS.has(attrName) &&
            text.includes(' ') &&
            text.length > 5
          ) {
            if (isTranslatable(text, true)) {
              results.push({
                hash: hashString(text),
                sourceText: text,
                filePath,
                nodeType: 'JSXAttribute',
                context: attrName,
              });
            }
          }
          return;
        }

        /** {"Get started free"} — StringLiteral in a JSX expression container */
        if (parent.type === 'JSXExpressionContainer') {
          if (!isTranslatable(text, true)) return;
          results.push({
            hash: hashString(text),
            sourceText: text,
            filePath,
            nodeType: 'StringLiteral',
            context: 'JSXExpressionContainer',
          });
          return;
        }

        /** Array / object / variable declarations with user-facing multi-word strings */
        const dataParentTypes = new Set([
          'VariableDeclarator',
          'Property',
          'ObjectProperty',
          'ArrayExpression',
        ]);
        if (
          dataParentTypes.has(parent.type) &&
          text.includes(' ') &&
          text.length > 5
        ) {
          if (isTranslatable(text, false)) {
            results.push({
              hash: hashString(text),
              sourceText: text,
              filePath,
              nodeType: 'StringLiteral',
              context: parent.type,
            });
          }
        }
      },

      /** Static template literal with no expressions: `Welcome back` */
      TemplateLiteral(path) {
        if (path.node.expressions.length !== 0) return; // skip dynamic templates
        const text = path.node.quasis[0]?.value.cooked
          ?.replace(/\s+/g, ' ')
          .trim();
        if (!text) return;
        const isJSX = path.parent.type === 'JSXExpressionContainer';
        if (!isTranslatable(text, isJSX)) return;
        results.push({
          hash: hashString(text),
          sourceText: text,
          filePath,
          nodeType: 'TemplateLiteral',
          context: path.parent.type,
        });
      },
    });

    return results;
  }
}

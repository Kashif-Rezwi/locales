import { Injectable, Logger } from '@nestjs/common';
import * as babelParser from '@babel/parser';
import babelTraverse from '@babel/traverse';
import babelGenerator from '@babel/generator';
import * as t from '@babel/types';
import type { SourceString } from '../adapters/adapter.types';
import type { ModifiedFile } from '../adapters/adapter.types';

/** Attribute names that carry user-facing text — must match ExtractionService. */
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

// Resolve the default export regardless of how the module is bundled
const traverse =
  (babelTraverse as unknown as { default: typeof babelTraverse }).default ??
  babelTraverse;
const generate =
  (babelGenerator as unknown as { default: typeof babelGenerator }).default ??
  babelGenerator;

/**
 * CodeModService — Pass 1 of the two-pass i18n transformation.
 *
 * Reads source files (already extracted in Chunk 5), replaces every
 * user-facing string node with `t("hash")`, and returns modified file
 * contents. Files with zero replacements return null (skipped).
 *
 * All transforms happen in server memory — the workspace is never written.
 */
@Injectable()
export class CodeModService {
  private readonly logger = new Logger(CodeModService.name);

  /**
   * Transforms a list of source files, replacing extracted strings with t() calls.
   *
   * @param sourceStrings - Strings identified by ExtractionService (Chunk 5).
   * @param readFile      - Function to read raw source by path.
   * @returns ModifiedFile[] — only files where at least one substitution was made.
   */
  async transformFiles(
    sourceStrings: SourceString[],
    readFile: (path: string) => Promise<string | null>,
  ): Promise<ModifiedFile[]> {
    if (sourceStrings.length === 0) return [];

    // Build a lookup: text → hash  (O(1) per node during traversal)
    const textToHash = new Map<string, string>();
    for (const s of sourceStrings) {
      textToHash.set(s.sourceText.trim(), s.hash);
    }

    // Group strings by file for per-file transformation
    const fileToStrings = new Map<string, SourceString[]>();
    for (const s of sourceStrings) {
      const arr = fileToStrings.get(s.filePath) ?? [];
      arr.push(s);
      fileToStrings.set(s.filePath, arr);
    }

    const results: ModifiedFile[] = [];

    for (const [filePath, strings] of fileToStrings) {
      const fileTextToHash = new Map<string, string>();
      for (const s of strings) fileTextToHash.set(s.sourceText.trim(), s.hash);

      const code = await readFile(filePath);
      if (!code) continue;

      const transformed = this.transformCode(code, filePath, fileTextToHash);
      if (transformed !== null) {
        results.push({ filePath, content: transformed });
      }
    }

    this.logger.debug(`Code mod: ${results.length} files transformed`);
    return results;
  }

  /** Transforms a single file's source code. Returns null if no substitutions made. */
  transformCode(
    code: string,
    filePath: string,
    textToHash: Map<string, string>,
  ): string | null {
    let ast: ReturnType<typeof babelParser.parse>;
    try {
      ast = babelParser.parse(code, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators',
          'classProperties',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
        errorRecovery: true,
      });
    } catch {
      this.logger.warn(
        `CodeMod: Babel parse failed for ${filePath} — skipping`,
      );
      return null;
    }

    let substitutionCount = 0;

    traverse(ast, {
      /** <h1>Welcome</h1>  →  <h1>{t("hash")}</h1> */
      JSXText(path) {
        const text = path.node.value.replace(/\s+/g, ' ').trim();
        const hash = textToHash.get(text);
        if (!hash) return;

        const tCall = buildTCall(hash);
        path.replaceWith(t.jsxExpressionContainer(tCall));
        substitutionCount++;
      },

      StringLiteral(path) {
        const text = path.node.value.trim();
        const hash = textToHash.get(text);
        if (!hash) return;

        const parent = path.parent;

        /** placeholder="Email"  →  placeholder={t("hash")} */
        if (parent.type === 'JSXAttribute') {
          const attrName = parent.name;
          const name = t.isJSXIdentifier(attrName) ? attrName.name : null;
          if (
            name &&
            (TRANSLATABLE_ATTRS.has(name) ||
              (text.includes(' ') && text.length > 5))
          ) {
            path.replaceWith(t.jsxExpressionContainer(buildTCall(hash)));
            substitutionCount++;
          }
          return;
        }

        /** {"Get started"}  →  {t("hash")} */
        if (parent.type === 'JSXExpressionContainer') {
          path.replaceWith(buildTCall(hash));
          substitutionCount++;
          return;
        }

        /** const label = "Welcome"  →  const label = t("hash") */
        const dataParents = new Set([
          'VariableDeclarator',
          'Property',
          'ObjectProperty',
          'ArrayExpression',
        ]);
        if (
          dataParents.has(parent.type) &&
          text.includes(' ') &&
          text.length > 5
        ) {
          path.replaceWith(buildTCall(hash));
          substitutionCount++;
        }
      },

      /** `Static text`  →  t("hash") */
      TemplateLiteral(path) {
        if (path.node.expressions.length !== 0) return;
        const text = path.node.quasis[0]?.value.cooked
          ?.replace(/\s+/g, ' ')
          .trim();
        if (!text) return;
        const hash = textToHash.get(text);
        if (!hash) return;

        const tCall = buildTCall(hash);
        if (path.parent.type === 'JSXExpressionContainer') {
          path.replaceWith(tCall);
        } else {
          path.replaceWith(tCall);
        }
        substitutionCount++;
      },
    });

    if (substitutionCount === 0) return null;

    // Add `import { t } from '../lib/i18n';` if not already present
    ensureI18nImport(ast, filePath);

    const output = generate(
      ast,
      { retainLines: false, jsescOption: { minimal: true } },
      code,
    );
    return output.code;
  }
}

/** Builds the AST node for `t("hash")` */
function buildTCall(hash: string): t.CallExpression {
  return t.callExpression(t.identifier('t'), [t.stringLiteral(hash)]);
}

/**
 * Inserts `import { t } from '../lib/i18n';` at the top of the file
 * if no existing import of 't' from any 'i18n' module is found.
 */
function ensureI18nImport(ast: t.File, _filePath: string): void {
  const hasImport = ast.program.body.some(
    (node) =>
      t.isImportDeclaration(node) &&
      node.source.value.includes('i18n') &&
      node.specifiers.some(
        (s) =>
          t.isImportSpecifier(s) &&
          (t.isIdentifier(s.imported) ? s.imported.name : s.imported.value) ===
            't',
      ),
  );

  if (hasImport) return;

  const importDecl = t.importDeclaration(
    [t.importSpecifier(t.identifier('t'), t.identifier('t'))],
    t.stringLiteral('../lib/i18n'),
  );

  ast.program.body.unshift(importDecl);
}

/**
 * Render-time math delimiter preprocessing (design.md §10.4 semantic table;
 * plan 2026-08-25-0410-1, P1-2 + P1-3 remediation Phase 2 Decision (b)).
 *
 * The buffer cut layer (`markdown-buffer.ts`) and the remark-math grammar
 * layer disagree about what counts as math on two realistic inputs:
 *
 * - Currency prose (`The plan costs $5 today and $10 tomorrow.`) survives the
 *   buffer (its single-`$` open guard refuses `$`+digit), but remark-math's
 *   default `singleDollarTextMath: true` pairs the two dollars and typesets
 *   the whole sentence as math.
 * - Mainstream LLM delimiters `\(...\)` / `\[...\]` are tracked by the buffer
 *   as math boundaries, but remark-math only parses `$` / `$$`, so they render
 *   as literal text.
 *
 * This module closes both gaps between `safeMarkdownSlice` and the markdown
 * pipeline with a fixed two-pass transform over NON-code regions (code masking
 * comes from the single `computeCodeRegionMask` definition point):
 *
 * ① Currency escape — an ORIGINAL-text single `$` followed by a digit is
 *   escaped to `\$` (literal dollar). `$$`+ runs are immune (block-math
 *   territory), `\`-escaped dollars are immune, masked (code) dollars are
 *   immune. Unlike the buffer guard (open side only), the close side is
 *   escaped too: `$x$5` renders fully literal.
 * ② Paired delimiter mapping — `\(`/`\)` → `$` and `\[`/`\]` → `$$`,
 *   left-to-right pairing; orphan closers (and closers whose open never
 *   came) stay literal, `\\(`/`\\)` (escaped backslash + plain paren) stay
 *   literal. Dollars generated here never feed back into pass ①.
 *
 * The order is fixed: mapping first would let the currency pass destroy
 * digit-leading `\(...\)` formulas (`\(3 \times 10^8\)` → `$3 ...$` → `\$3`).
 *
 * This is a pure string processor: no React, no DOM, no IO (INV-1).
 */

import { computeCodeRegionMask } from './markdown-buffer.js';

/** Preprocess a safe markdown slice for math rendering (two passes, fixed order). */
export function preprocessMathDelimiters(source: string): string {
  return mapPairedParenBracketDelimiters(escapeCurrencyDollars(source));
}

/**
 * Pass ①: escape original-text currency dollars. A single `$` directly
 * followed by an ASCII digit becomes `\$`; `$$`+ runs, already-escaped `\$`,
 * and code regions are untouched. Digit-leading formulas must use `$$` or
 * `\(...\)` form (design.md §10.4 delimiter contract).
 */
function escapeCurrencyDollars(text: string): string {
  const masked = computeCodeRegionMask(text);
  const len = text.length;
  let out = '';
  let copyFrom = 0;
  let i = 0;
  while (i < len) {
    if (text.charCodeAt(i) !== 0x24 /* `$` */ || masked[i]) {
      i++;
      continue;
    }
    // Measure the raw dollar run starting at `i`.
    let runEnd = i;
    while (runEnd < len && text.charCodeAt(runEnd) === 0x24) runEnd++;
    if (runEnd - i >= 2) {
      // `$$`+ run: block-math territory, immune to the currency escape.
      i = runEnd;
      continue;
    }
    if (isEscapedAt(text, i)) {
      // `\$` is a literal dollar already, do not double-escape.
      i++;
      continue;
    }
    const next = i + 1 < len ? text.charCodeAt(i + 1) : -1;
    if (next >= 0x30 /* 0 */ && next <= 0x39 /* 9 */) {
      out += `${text.slice(copyFrom, i)}\\`;
      copyFrom = i;
    }
    i++;
  }
  return out + text.slice(copyFrom);
}

/**
 * Pass ②: map paired `\(`/`\)` → `$` and `\[`/`\]` → `$$`. Pairing runs
 * left-to-right per kind; an orphan close (no pending open of its kind) and
 * an open that never closes stay literal, as do escaped-backslash forms
 * (`\\(` = literal `\` + `(`). Masked (code) delimiters are untouched.
 */
function mapPairedParenBracketDelimiters(text: string): string {
  const masked = computeCodeRegionMask(text);
  const len = text.length;
  const replacements = new Map<number, string>();
  let pendingInline = -1;
  let pendingBlock = -1;
  let i = 0;
  while (i < len) {
    if (text[i] !== '\\' || masked[i]) {
      i++;
      continue;
    }
    // Measure the backslash run starting at `i`.
    let runEnd = i;
    while (runEnd < len && text[runEnd] === '\\') runEnd++;
    const nextIdx = runEnd;
    const next = nextIdx < len ? text[nextIdx] : '';
    if ((runEnd - i) % 2 === 1 && next !== '' && !masked[nextIdx]) {
      // The final backslash of an odd run escapes `next`.
      switch (next) {
        case '(':
          pendingInline = i;
          break;
        case '[':
          pendingBlock = i;
          break;
        case ')':
          if (pendingInline !== -1) {
            replacements.set(pendingInline, '$');
            replacements.set(i, '$');
            pendingInline = -1;
          }
          break;
        case ']':
          if (pendingBlock !== -1) {
            replacements.set(pendingBlock, '$$');
            replacements.set(i, '$$');
            pendingBlock = -1;
          }
          break;
        default:
          break; // other CommonMark escapes (incl. `\$`): untouched
      }
      i = nextIdx + 1;
    } else {
      // Even run: literal backslash pairs, the next char is plain.
      i = runEnd;
    }
  }
  return spliceReplacements(text, replacements);
}

/** True when the character at `index` is escaped by an odd backslash run. */
function isEscapedAt(text: string, index: number): boolean {
  let backslashes = 0;
  let j = index - 1;
  while (j >= 0 && text.charCodeAt(j) === 0x5c /* `\` */) {
    backslashes++;
    j--;
  }
  return backslashes % 2 === 1;
}

/** Rebuild `text` replacing each 2-char delimiter at the given index. */
function spliceReplacements(text: string, replacements: Map<number, string>): string {
  if (replacements.size === 0) return text;
  const indices = [...replacements.keys()].sort((a, b) => a - b);
  let out = '';
  let copyFrom = 0;
  for (const idx of indices) {
    out += text.slice(copyFrom, idx) + (replacements.get(idx) ?? '');
    copyFrom = idx + 2; // skip the consumed `\(` / `\)` / `\[` / `\]`
  }
  return out + text.slice(copyFrom);
}

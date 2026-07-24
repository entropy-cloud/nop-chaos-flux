/**
 * Streaming-safe markdown slice (A-2, design.md §10.4 path C).
 *
 * Problem this solves: when chunks arrive mid-character or mid-fence, naive
 * `react-markdown` re-parse per chunk causes (a) CJK garbling (a UTF-16
 * surrogate pair split across chunks renders the lone half as ), and
 * (b) flicker / mis-highlighting when an open ``` code fence or `$$` math
 * delimiter is temporarily unmatched.
 *
 * Approach (~1KB, dependency-free): `safeMarkdownSlice(raw)` returns the
 * longest prefix of the accumulated raw text that is "safe to render" — i.e.
 * with complete UTF-16 characters and balanced code-fence / math-delimiter
 * markers. The ai-bubble markdown renderer recomputes this from the full
 * accumulated message content on each render (stateless), so no streaming
 * state needs to be tracked here.
 *
 * This is a pure string-processor: no React, no DOM, no streaming protocol
 * knowledge (INV-1). The `ai-bubble` markdown renderer wraps it.
 */

const CODE_FENCE = /(^|\n)(`{3,}|~{3,})/g;
const MATH_BLOCK = /\$\$/g;
const MATH_INLINE_OPEN = /\\\(/g;
const MATH_INLINE_CLOSE = /\\\)/g;

/**
 * Compute the safe-to-render prefix of the given raw markdown text. Returns
 * the prefix that ends on a complete UTF-16 character and is not left
 * dangling inside an unclosed code fence or math block.
 *
 * This is the stateless variant used by the `ai-bubble` markdown renderer on
 * each render: since the engine passes the full accumulated message content,
 * we can recompute the safe slice from scratch without tracking pending state.
 */
export function safeMarkdownSlice(raw: string): string {
  if (raw.length === 0) return '';

  // 1. UTF-16 safety: drop a trailing lone surrogate.
  let safeEnd = raw.length;
  const lastCode = raw.charCodeAt(safeEnd - 1);
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
    safeEnd -= 1;
  }
  let prefix = raw.slice(0, safeEnd);

  // 2. Code fence balance.
  const fenceCut = findUnclosedFenceCutoff(prefix);
  if (fenceCut !== undefined) {
    prefix = prefix.slice(0, fenceCut);
  } else {
    // 3. Math block balance (only when fences are balanced).
    const mathCut = findUnclosedMathCutoff(prefix);
    if (mathCut !== undefined) {
      prefix = prefix.slice(0, mathCut);
    }
  }

  return prefix;
}

/**
 * Locate the index at which to cut so that an odd number of code fences is
 * avoided. Returns `undefined` when fences are balanced (safe to render all).
 */
function findUnclosedFenceCutoff(text: string): number | undefined {
  const matches = [...text.matchAll(CODE_FENCE)];
  if (matches.length === 0) return undefined;
  if (matches.length % 2 === 0) return undefined;

  // Odd count → the last fence is unclosed. Cut at its start (including the
  // preceding newline so we don't leave a stray `\n` that confuses the next
  // render).
  const last = matches[matches.length - 1];
  const fenceStart = (last.index ?? 0) + (last[1]?.length ?? 0);
  return fenceStart;
}

/**
 * Locate the index at which to cut so that an odd number of `$$` math block
 * delimiters is avoided. Also handles unbalanced `\(` / `\)`.
 */
function findUnclosedMathCutoff(text: string): number | undefined {
  const dollarMatches = [...text.matchAll(MATH_BLOCK)];
  if (dollarMatches.length % 2 === 1) {
    const last = dollarMatches[dollarMatches.length - 1];
    return last.index ?? 0;
  }

  const opens = [...text.matchAll(MATH_INLINE_OPEN)];
  const closes = [...text.matchAll(MATH_INLINE_CLOSE)];
  if (opens.length > closes.length) {
    const last = opens[opens.length - 1];
    return last.index ?? 0;
  }

  return undefined;
}

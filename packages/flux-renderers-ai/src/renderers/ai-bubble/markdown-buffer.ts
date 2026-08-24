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

const MATH_BLOCK = /\$\$/g;
const MATH_INLINE_OPEN = /\\\(/g;
const MATH_INLINE_CLOSE = /\\\)/g;
const MATH_BRACKET_OPEN = /\\\[/g;
const MATH_BRACKET_CLOSE = /\\\]/g;

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
 *
 * P2 (CommonMark fence parity): ``` and ~~~ are distinct fence kinds and
 * cannot close each other. A `````` ``` `````` opening must be closed by
 * another ``` run; a `~~~` opening must be closed by another `~~~` run. We
 * count each kind independently and cut at the last unclosed fence of
 * whichever kind has an odd count.
 */
function findUnclosedFenceCutoff(text: string): number | undefined {
  const backtickCut = findUnclosedFenceCutoffForKind(text, '`');
  // Only one of the two kinds can be "unclosed" at the end of a well-formed
  // prefix; if both report a cutoff we take the earlier (more conservative).
  const tildeCut = findUnclosedFenceCutoffForKind(text, '~');
  if (backtickCut === undefined) return tildeCut;
  if (tildeCut === undefined) return backtickCut;
  return Math.min(backtickCut, tildeCut);
}

function findUnclosedFenceCutoffForKind(text: string, ch: '`' | '~'): number | undefined {
  // ≤3 leading spaces are part of a fence opener (CommonMark), aligned with
  // `maskFencedCode`'s `^ {0,3}` caliber — indented fences have the same
  // identity in both scanners.
  const fenceRe = new RegExp(`(^|\\n)( {0,3})(${ch}{3,})`, 'g');
  const matches = [...text.matchAll(fenceRe)];
  if (matches.length === 0) return undefined;
  if (matches.length % 2 === 0) return undefined;

  // Odd count → the last fence is unclosed. Cut at its start (the line start,
  // so the fence indentation and the preceding newline stay out of the safe
  // prefix — same convention as `maskFencedCode`'s line-start `fenceStart`).
  const last = matches[matches.length - 1];
  const fenceStart = (last.index ?? 0) + (last[1]?.length ?? 0);
  return fenceStart;
}

/**
 * Locate the index at which to cut so that an odd number of `$$` math block
 * delimiters is avoided. Also handles unbalanced `\(` / `\)` and — D6 —
 * unbalanced `\[` / `\]` block delimiters and unclosed single-`$` inline
 * math candidates.
 *
 * P1-1: `$$` / `\[` / `\(` counting shares the `maskCodeRegions` code mask
 * with the single-`$` scanner — dollars and paren/bracket delimiters inside
 * fenced/inline code are literal (bash `$$` PID, PHP `$$var`, regex sources)
 * and never participate in math parity, so complete messages containing them
 * render in full instead of being permanently truncated.
 */
function findUnclosedMathCutoff(text: string): number | undefined {
  const masked = computeCodeRegionMask(text);

  const dollarMatches = unmaskedMatches(text, MATH_BLOCK, masked);
  if (dollarMatches.length % 2 === 1) {
    const last = dollarMatches[dollarMatches.length - 1];
    return last.index ?? 0;
  }

  // D6: `\[` / `\]` block math, aligned with the `\(` / `\)` handling below.
  const bracketOpens = unmaskedMatches(text, MATH_BRACKET_OPEN, masked);
  const bracketCloses = unmaskedMatches(text, MATH_BRACKET_CLOSE, masked);
  if (bracketOpens.length > bracketCloses.length) {
    const last = bracketOpens[bracketOpens.length - 1];
    return last.index ?? 0;
  }

  const opens = unmaskedMatches(text, MATH_INLINE_OPEN, masked);
  const closes = unmaskedMatches(text, MATH_INLINE_CLOSE, masked);
  if (opens.length > closes.length) {
    const last = opens[opens.length - 1];
    return last.index ?? 0;
  }

  return findUnclosedSingleDollarCutoff(text, masked);
}

function unmaskedMatches(text: string, re: RegExp, masked: Uint8Array): RegExpMatchArray[] {
  return [...text.matchAll(re)].filter((m) => !masked[m.index ?? 0]);
}

/**
 * D6 (Decision D-a): locate the cut for an unclosed single-`$` inline math
 * candidate, with an anti-currency guard. A `$` only OPENS a math candidate
 * when the next character is neither whitespace nor a digit, so currency
 * text (`$5` / `$ 5` / `US$`) never opens a candidate and complete currency
 * sentences are never truncated (currency-single-dollar failure path).
 *
 * Immunity: `$$`+ runs (block math is owned by the `$$` parity check above),
 * fenced code regions, inline code spans, and escaped `\$` do not participate
 * in single-`$` pairing.
 *
 * Pairing model follows micromark-extension-math semantics (live-verified):
 * an open `$` is closed by the NEXT single-`$` run — space-padded closers are
 * valid — so a candidate with no later single-`$` is unclosed and we cut at
 * its index (same cut-at-delimiter-start convention as `$$`).
 */
function findUnclosedSingleDollarCutoff(text: string, masked: Uint8Array): number | undefined {
  const len = text.length;

  let open = -1;
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
      // `$$`+ run: block-math territory, never a single-`$` delimiter.
      i = runEnd;
      continue;
    }
    if (i > 0 && text.charCodeAt(i - 1) === 0x5c /* `\` */) {
      // Escaped `\$` is a literal dollar, not a delimiter.
      i++;
      continue;
    }
    if (open === -1) {
      const next = i + 1 < len ? text.charCodeAt(i + 1) : -1;
      const opensCandidate =
        next !== -1 &&
        !isWhitespaceCode(next) &&
        !(next >= 0x30 /* 0 */ && next <= 0x39 /* 9 */);
      if (opensCandidate) open = i;
    } else {
      // Any later single-`$` closes (micromark padding semantics).
      open = -1;
    }
    i++;
  }
  return open === -1 ? undefined : open;
}

function isWhitespaceCode(code: number): boolean {
  return (
    code === 0x20 /* space */ ||
    code === 0x09 /* tab */ ||
    code === 0x0a /* LF */ ||
    code === 0x0d /* CR */ ||
    code === 0x0c /* FF */
  );
}

/**
 * Compute the code-region mask for `text`: `masked[i] === 1` means index `i`
 * sits inside a fenced code block or inline code span. This is the single
 * definition point of "what is a code region" — the buffer cut layer and the
 * render-time math-delimiter preprocessing (`math-delimiter-preprocess.ts`)
 * both consume this mask instead of each keeping a scanner copy.
 */
export function computeCodeRegionMask(text: string): Uint8Array {
  const masked = new Uint8Array(text.length);
  maskCodeRegions(text, masked);
  return masked;
}

/**
 * Mask (set to 1) the character indices that code contexts occupy: fenced
 * code blocks (``` / ~~~, whole region from opening fence through closing
 * fence) and inline code spans (matching backtick runs). Dollars inside code
 * are literal (shell variables, prices in code) and must not be mistaken for
 * math delimiters.
 */
function maskCodeRegions(text: string, masked: Uint8Array): void {
  maskFencedCode(text, masked);
  maskInlineCodeSpans(text, masked);
}

function maskFencedCode(text: string, masked: Uint8Array): void {
  const lineRe = /^ {0,3}(`{3,}|~{3,})/;
  let offset = 0;
  let fenceChar = '';
  let fenceLen = 0;
  let fenceStart = -1;
  for (const line of text.split('\n')) {
    const match = lineRe.exec(line);
    if (fenceChar === '') {
      if (match) {
        fenceChar = match[1][0];
        fenceLen = match[1].length;
        fenceStart = offset;
      }
    } else if (match && match[1][0] === fenceChar && match[1].length >= fenceLen) {
      // Closing fence: mask the whole fenced region (fences included).
      maskRange(masked, fenceStart, offset + line.length);
      fenceChar = '';
    }
    offset += line.length + 1;
  }
  if (fenceChar !== '') {
    // Unclosed fence: the fence cutter owns this case (safeMarkdownSlice only
    // reaches the math scan when fences are balanced, but stay inert here).
    maskRange(masked, fenceStart, text.length);
  }
}

function maskInlineCodeSpans(text: string, masked: Uint8Array): void {
  const len = text.length;
  let i = 0;
  while (i < len) {
    if (text[i] !== '`' || masked[i]) {
      i++;
      continue;
    }
    const start = i;
    let openLen = 0;
    while (i < len && text[i] === '`') {
      openLen++;
      i++;
    }
    // Find the next unmasked backtick run of exactly the same length.
    let j = i;
    let closeStart = -1;
    while (j < len) {
      if (text[j] === '`' && !masked[j]) {
        const runStart = j;
        let runLen = 0;
        while (j < len && text[j] === '`') {
          runLen++;
          j++;
        }
        if (runLen === openLen) {
          closeStart = runStart;
          break;
        }
      } else {
        j++;
      }
    }
    if (closeStart === -1) continue; // unmatched backtick run: literal
    maskRange(masked, start, closeStart + openLen);
    i = closeStart + openLen;
  }
}

function maskRange(masked: Uint8Array, start: number, end: number): void {
  for (let i = Math.max(0, start); i < Math.min(masked.length, end); i++) masked[i] = 1;
}

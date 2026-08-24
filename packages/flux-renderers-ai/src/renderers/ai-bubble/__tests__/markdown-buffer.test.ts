import { describe, it, expect } from 'vitest';
import { safeMarkdownSlice } from '../markdown-buffer.js';

describe('A-2 safeMarkdownSlice — CJK / UTF-16 safety', () => {
  it('returns the full string when all characters are complete', () => {
    expect(safeMarkdownSlice('Hello 世界')).toBe('Hello 世界');
  });

  it('holds back a trailing lone high surrogate (CJK half-character)', () => {
    // U+2000B (𠀁) is encoded as the surrogate pair 0xD840 0xDC00.
    // Stream only the first half: a lone high surrogate.
    const full = '𠀁';
    const half = full.charAt(0);
    expect(safeMarkdownSlice(half)).toBe('');
    // Once the full character is present, it renders.
    expect(safeMarkdownSlice(full)).toBe('𠀁');
  });

  it('renders a full string of supplementary-plane CJK characters without garbling', () => {
    expect(safeMarkdownSlice('你好世界𠀁')).toBe('你好世界𠀁');
  });

  it('drops only the trailing lone surrogate, keeping preceding text', () => {
    const full = '𠀁';
    // 'tail' followed by a lone surrogate → surrogate held back, tail kept.
    expect(safeMarkdownSlice('tail' + full.charAt(0))).toBe('tail');
  });
});

describe('A-2 safeMarkdownSlice — code fence balance', () => {
  it('renders normally with no fences', () => {
    expect(safeMarkdownSlice('# Title\n\nplain text')).toBe('# Title\n\nplain text');
  });

  it('renders balanced fences fully', () => {
    expect(safeMarkdownSlice('before\n```js\nconst x = 1;\n```\nafter')).toBe(
      'before\n```js\nconst x = 1;\n```\nafter',
    );
  });

  it('holds back content after an unclosed ``` fence so the rest is not rendered as code', () => {
    const safe = safeMarkdownSlice('intro\n```\nthis is code\nthis should be held back too');
    // The fence is unclosed → cut at the fence start.
    expect(safe).toBe('intro\n');
  });

  it('handles ~~~ fences the same as ```', () => {
    expect(safeMarkdownSlice('~~~\nunfinished')).toBe('');
  });

  // P2 (FP markdown-buffer fence parity): CommonMark says ``` and ~~~ are
  // distinct fence kinds — a ``` opening cannot be closed by ~~~, and vice
  // versa. The previous implementation counted both as the same "fence" token,
  // so a ~~~ inside a ``` block falsely closed it (the held-back suffix was
  // rendered as live markdown instead of staying inside the code block).
  it('CommonMark: ~~~ does NOT close a ``` fence (mismatched fence stays open)', () => {
    const safe = safeMarkdownSlice('```\ncode still open\n~~~\nwould-close-wrongly');
    // The opening ``` is never closed by a matching ``` → cut at the fence
    // start so the entire region after it is held back from rendering.
    expect(safe).toBe('');
  });

  it('CommonMark: ``` does NOT close a ~~~ fence', () => {
    const safe = safeMarkdownSlice('~~~\ncode still open\n```\nwould-close-wrongly');
    expect(safe).toBe('');
  });

  it('CommonMark: same-kind fence closes correctly inside a code block', () => {
    // Balanced ``` open/close with a stray ~~~ inside → balanced (the stray
    // ~~~ is literal text inside the code block, not a fence).
    const safe = safeMarkdownSlice('```\nstray ~~~ line\n```\nafter');
    expect(safe).toBe('```\nstray ~~~ line\n```\nafter');
  });

  it('CommonMark: nested-different-kind fences — ``` around ~~~', () => {
    // Outer ``` open / inner ~~~ open / inner ~~~ close / outer ``` close.
    // The outer ``` is closed by the trailing ``` (same kind), so the whole
    // span is balanced and renders fully.
    const safe = safeMarkdownSlice('```\n~~~\ncode\n~~~\n```');
    expect(safe).toBe('```\n~~~\ncode\n~~~\n```');
  });
});

describe('A-2 safeMarkdownSlice — math delimiter balance', () => {
  it('holds back an unclosed $$ math block', () => {
    expect(safeMarkdownSlice('text\n$$\n\\int_0^1 x dx')).toBe('text\n');
  });

  it('renders balanced $$ blocks fully', () => {
    expect(safeMarkdownSlice('$$a^2$$ done')).toBe('$$a^2$$ done');
  });

  it('holds back an unclosed \\( inline math', () => {
    expect(safeMarkdownSlice('see \\(x + y')).toBe('see ');
  });
});

// ============================================================================
// D6: single-`$` inline math boundary (Decision D-a anti-currency caliber) +
// `\[` / `\]` block math boundary. The single-`$` scanner must be immune to
// `$$` pairing, inline code spans, and fenced code; currency text
// (`$5` / `$ 5` / `US$`) must never be truncated on complete text.
// ============================================================================
describe('D6 safeMarkdownSlice — \\[ block math boundary', () => {
  it('holds back an unclosed \\[ block math', () => {
    expect(safeMarkdownSlice('text \\[\nE = mc^2')).toBe('text ');
  });

  it('renders balanced \\[ \\] blocks fully', () => {
    expect(safeMarkdownSlice('intro \\[ E = mc^2 \\] outro')).toBe('intro \\[ E = mc^2 \\] outro');
  });

  it('cuts at the LAST unclosed \\[ when several are balanced first', () => {
    expect(safeMarkdownSlice('a \\[ x \\] b \\[ y')).toBe('a \\[ x \\] b ');
  });
});

describe('D6 safeMarkdownSlice — single-$ inline math boundary (Decision D-a)', () => {
  it('holds back an unclosed single-$ math candidate mid-stream', () => {
    // Streaming prefix: `$\frac{1}{` opened but the closing `$` chunk has not
    // arrived — cut at the `$` so no broken math half-renders.
    expect(safeMarkdownSlice('text $\\frac{1}{')).toBe('text ');
  });

  it('restores the full render once the closing $ arrives (streaming semantics)', () => {
    const streamed = 'text $\\frac{1}{2}$ done';
    expect(safeMarkdownSlice(streamed)).toBe(streamed);
  });

  it('renders balanced single-$ inline math fully', () => {
    expect(safeMarkdownSlice('value $E = mc^2$ here')).toBe('value $E = mc^2$ here');
  });

  it('does not truncate currency text ($5 / $ 5 / US$)', () => {
    expect(safeMarkdownSlice('costs $5 today')).toBe('costs $5 today');
    expect(safeMarkdownSlice('pay $ 5 now')).toBe('pay $ 5 now');
    expect(safeMarkdownSlice('US$ and $5')).toBe('US$ and $5');
  });

  it('does not truncate a lone currency dollar in a longer sentence', () => {
    expect(safeMarkdownSlice('the total is $5 today only')).toBe('the total is $5 today only');
  });

  it('is immune to $$ pairs (the single-$ scan skips $$ runs)', () => {
    expect(safeMarkdownSlice('$$E$$ and $x$ tail')).toBe('$$E$$ and $x$ tail');
  });

  it('is immune to inline code span content', () => {
    expect(safeMarkdownSlice('run `costs $ten` now')).toBe('run `costs $ten` now');
  });

  it('is immune to balanced fenced code containing dollars', () => {
    const fenced = '```bash\necho $HOME is $USER\n```';
    expect(safeMarkdownSlice(fenced)).toBe(fenced);
  });

  it('keeps the existing unclosed-fence cut when dollars are inside (regression)', () => {
    expect(safeMarkdownSlice('intro\n```\necho $5')).toBe('intro\n');
  });
});

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

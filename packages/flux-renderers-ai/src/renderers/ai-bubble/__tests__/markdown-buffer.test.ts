import { describe, it, expect } from 'vitest';
import {
  appendMarkdownChunk,
  createMarkdownBuffer,
  flushMarkdownBuffer,
  renderSafeMarkdownSlice,
} from '../markdown-buffer.js';

describe('A-2 streaming markdown buffer — CJK safety', () => {
  it('returns the full string when all characters are complete', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, 'Hello 世界');
    expect(renderSafeMarkdownSlice(buf)).toBe('Hello 世界');
  });

  it('holds back a trailing lone high surrogate (CJK half-character)', () => {
    const buf = createMarkdownBuffer();
    // U+2000B (𠀁) is encoded as the surrogate pair 0xD840 0xDC00.
    // Stream only the first half: a lone high surrogate.
    const full = '𠀁';
    const half = full.charAt(0);
    appendMarkdownChunk(buf, half);
    const safe = renderSafeMarkdownSlice(buf);
    // Held back → empty (or no lone surrogate in the output).
    expect(safe).toBe('');
    expect(buf.pendingTail).toBe(half);

    // After the second half arrives, both render together.
    appendMarkdownChunk(buf, full.charAt(1));
    const safe2 = renderSafeMarkdownSlice(buf);
    expect(safe2).toBe('𠀁');
    expect(buf.pendingTail).toBe('');
  });

  it('accumulates multiple CJK characters chunk-by-chunk without garbling', () => {
    const buf = createMarkdownBuffer();
    const target = '你好世界𠀁';
    // Stream one UTF-16 code unit at a time.
    for (const ch of Array.from(target)) {
      appendMarkdownChunk(buf, ch);
    }
    expect(renderSafeMarkdownSlice(buf)).toBe(target);
  });
});

describe('A-2 streaming markdown buffer — code fence balance', () => {
  it('renders normally with no fences', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, '# Title\n\nplain text');
    expect(renderSafeMarkdownSlice(buf)).toBe('# Title\n\nplain text');
  });

  it('renders balanced fences fully', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, 'before\n```js\nconst x = 1;\n```\nafter');
    expect(renderSafeMarkdownSlice(buf)).toBe('before\n```js\nconst x = 1;\n```\nafter');
  });

  it('holds back content after an unclosed ``` fence so the rest is not rendered as code', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, 'intro\n```\nthis is code\nthis should be held back too');
    const safe = renderSafeMarkdownSlice(buf);
    // The fence is unclosed → cut at the fence start.
    expect(safe).toBe('intro\n');
    // The held-back tail contains the open fence + everything after.
    expect(buf.pendingTail).toBe('```\nthis is code\nthis should be held back too');
  });

  it('resumes rendering once the fence closes', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, 'intro\n```\ncode here');
    renderSafeMarkdownSlice(buf); // pop the safe prefix
    appendMarkdownChunk(buf, '\nmore code\n```\nafter');
    const safe = renderSafeMarkdownSlice(buf);
    expect(safe).toBe('intro\n```\ncode here\nmore code\n```\nafter');
  });

  it('handles ~~~ fences the same as ```', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, '~~~\nunfinished');
    const safe = renderSafeMarkdownSlice(buf);
    expect(safe).toBe('');
  });
});

describe('A-2 streaming markdown buffer — math delimiter balance', () => {
  it('holds back an unclosed $$ math block', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, 'text\n$$\n\\int_0^1 x dx');
    const safe = renderSafeMarkdownSlice(buf);
    expect(safe).toBe('text\n');
  });

  it('renders balanced $$ blocks fully', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, '$$a^2$$ done');
    expect(renderSafeMarkdownSlice(buf)).toBe('$$a^2$$ done');
  });

  it('holds back an unclosed \\( inline math', () => {
    const buf = createMarkdownBuffer();
    appendMarkdownChunk(buf, 'see \\(x + y');
    const safe = renderSafeMarkdownSlice(buf);
    expect(safe).toBe('see ');
  });
});

describe('A-2 streaming markdown buffer — flush', () => {
  it('flush returns the full raw minus any dangling surrogate', () => {
    const buf = createMarkdownBuffer();
    const full = '𠀁';
    appendMarkdownChunk(buf, full.charAt(0)); // lone surrogate
    appendMarkdownChunk(buf, ' tail');
    const flushed = flushMarkdownBuffer(buf);
    expect(flushed).toBe(full.charAt(0) + ' tail');
  });
});

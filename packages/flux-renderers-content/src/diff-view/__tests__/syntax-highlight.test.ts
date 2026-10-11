import { afterEach, describe, expect, it, vi } from 'vitest';
import { highlight } from '../adapters/syntax-highlight.js';

afterEach(() => {
  vi.restoreAllMocks();
});

// WA-content-007 (plan 567): the adapter was born dead — a bare createLowlight()
// registered zero languages, so highlight() threw for every call and the catch
// silently degraded to escaped plain text (zero hl-* output, zero observability).
// These pins keep the feature alive: registered languages must produce token
// spans, and unknown languages must warn once instead of failing silently.
describe('diff-view syntax highlighting (WA-content-007)', () => {
  it('produces hl-* token spans for a registered language', () => {
    const html = highlight('var x = 1;', 'js');
    expect(html).toContain('hl-hljs-keyword');
    expect(html).toContain('hl-hljs-number');
    // content stays escaped inside the spans
    expect(html).toContain('var');
  });

  it('resolves schema-facing language aliases', () => {
    expect(highlight('var x = 1;', 'js')).toBe(highlight('var x = 1;', 'javascript'));
    expect(highlight('a: 1', 'yml')).toBe(highlight('a: 1', 'yaml'));
  });

  it('keeps plain languages unhighlighted', () => {
    expect(highlight('var x = 1;', 'plaintext')).not.toContain('hl-');
    expect(highlight('var x = 1;', 'text')).not.toContain('hl-');
  });

  it('warns once for an unregistered language instead of failing silently', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = highlight('code', 'definitely-not-a-language');
    expect(html).not.toContain('hl-');
    expect(html).toContain('code');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not registered'));
    warn.mockRestore();
  });
});

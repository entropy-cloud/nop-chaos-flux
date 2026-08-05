import { describe, expect, it } from 'vitest';
import { generateLineContentHtml } from '../utils/diff-template.js';
import type { InlineToken } from '../model/diff-inline.js';

describe('generateLineContentHtml DOM marker contract (design.md §10)', () => {
  it('escapes raw content when no inline tokens are provided', () => {
    const html = generateLineContentHtml('<script>alert(1)</script>', 'add');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('emits data-diff-inline="add" for insert tokens (P1-2)', () => {
    const tokens: InlineToken[] = [
      { type: 'equal', text: 'fix' },
      { type: 'insert', text: 'ed' },
    ];
    const html = generateLineContentHtml('fixed', 'add', tokens);
    expect(html).toContain('data-diff-inline="add"');
    expect(html).not.toContain('data-diff-inline="insert"');
    expect(html).not.toContain('data-diff-inline="equal"');
  });

  it('emits data-diff-inline="delete" for delete tokens (P1-2)', () => {
    const tokens: InlineToken[] = [
      { type: 'equal', text: 'fix' },
      { type: 'delete', text: 'ed' },
    ];
    const html = generateLineContentHtml('fixed', 'delete', tokens);
    expect(html).toContain('data-diff-inline="delete"');
    expect(html).not.toContain('data-diff-inline="insert"');
  });
});

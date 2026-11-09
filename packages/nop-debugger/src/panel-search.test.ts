import { describe, expect, it } from 'vitest';
import { matchesSearchQuery, parseRegexLiteral } from './panel-search.js';
import type { NopDebugEvent } from './types.js';

// plan 861 S4 (security R7): regex literals typed into the panel filter are
// compiled only when they pass the backtracking-safety gate.
describe('debugger panel search regex', () => {
  it('compiles a linear regex literal with flags', () => {
    const regex = parseRegexLiteral('/fetch(ed)?/i');
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex?.flags).toBe('i');
  });

  it.each([['/(a+)+$/'], ['/(a|aa)*$/'], ['/(.*a)+$/'], ['/.*.*.*x/']])('refuses super-linear pattern %s', (literal) => {
    expect(parseRegexLiteral(literal)).toBeNull();
  });

  it('falls back to plain text matching when the regex is refused', () => {
    const event = { summary: 'contains (a+)+$ literally', detail: '', source: '' } as unknown as NopDebugEvent;
    expect(matchesSearchQuery(event, '/(a+)+$/')).toBe(false);
    expect(matchesSearchQuery(event, '(a+)+$')).toBe(true);
  });
});

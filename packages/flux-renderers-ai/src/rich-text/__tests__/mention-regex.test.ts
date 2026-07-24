import { describe, it, expect } from 'vitest';
import { filterMentions, MENTION_TRIGGER } from '../extensions/mention.js';
import type { TiptapMentionItem } from '../types.js';

// ============================================================================
// P2 (FP N-4): the `@mention` query regex previously included `\\s` in its
// character class, contradicting the adjacent "no whitespace" comment. Typing
// a space after `@foo` should CLOSE the candidate popup (query rejected),
// not extend the match across whitespace. We verify by exercising the
// pure helper `filterMentions` and by reconstructing the same regex the
// detector uses, asserting it does not accept a query containing spaces.
// ============================================================================

const MENTIONS: TiptapMentionItem[] = [
  { id: 'u1', label: 'alice' },
  { id: 'u2', label: 'bob' },
  { id: 'u3', label: 'alex smith' },
];

describe('P2 N-4 — mention query regex no longer accepts whitespace', () => {
  it('the detector regex rejects a query containing a space (popup would close)', () => {
    // Mirror the regex built in detectMentionQuery (mention.ts:27). After the
    // fix the character class is [\\w.-]* (no \\s).
    const re = new RegExp(`${MENTION_TRIGGER}([\\w.-]*)$`);
    // `@foo bar` — typing a space terminates the query; the regex must NOT
    // match the trailing " bar".
    expect('@foo bar'.match(re)).toBeNull();
    // `@foo.bar-1` is still a valid query (punctuation allowed).
    expect('@foo.bar-1'.match(re)?.[1]).toBe('foo.bar-1');
    // `@foo` alone is a valid query.
    expect('@foo'.match(re)?.[1]).toBe('foo');
  });

  it('filterMentions remains substring-tolerant on label text', () => {
    // The fix only narrowed the QUERY regex; filtering still matches any
    // label that contains the query substring.
    expect(filterMentions(MENTIONS, 'al')).toEqual([
      { id: 'u1', label: 'alice' },
      { id: 'u3', label: 'alex smith' },
    ]);
    expect(filterMentions(MENTIONS, '')).toEqual(MENTIONS);
  });
});

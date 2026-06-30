import { describe, expect, it } from 'vitest';
import { buildTableRowEntries, normalizeRowKey } from '../table-renderer/table-data.js';

describe('table rowKey resolution (B3.1 / T1)', () => {
  it('resolves a single dotted rowKey path via the path binder', () => {
    expect(normalizeRowKey({ user: { id: 'a1' } }, 0, 'user.id')).toBe('a1');
  });

  it('keeps flat rowKey resolution unchanged after the path-binder baseline', () => {
    expect(normalizeRowKey({ id: 5 }, 0, 'id')).toBe('5');
  });

  it('falls back to __rowKey when no explicit rowKey field resolves', () => {
    expect(normalizeRowKey({ __rowKey: 'client-x' }, 0)).toBe('client-x');
  });

  it('falls back to id when neither rowKey field nor __rowKey resolve', () => {
    expect(normalizeRowKey({ id: 'srv-9' }, 0)).toBe('srv-9');
  });

  it('falls back to the legacy source-index token when no identity is present', () => {
    expect(normalizeRowKey({}, 3)).toBe('legacy-index:3');
  });

  it('builds row entries with nested-path-derived rowKey and dedups', () => {
    const entries = buildTableRowEntries(
      [
        { user: { id: 'a' } },
        { user: { id: 'b' } },
        { user: { id: 'a' } },
      ],
      'user.id',
    );

    expect(entries.map((entry) => entry.rowKey)).toEqual(['a', 'b', 'a']);
    // Duplicate keys get an owner-local cache key so they do not share scopes/UI state.
    expect(entries[0]!.cacheKey).toBe('a');
    expect(entries[2]!.cacheKey).toBe('a::dup:1');
  });
});

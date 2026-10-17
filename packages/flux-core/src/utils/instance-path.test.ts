import { describe, expect, it } from 'vitest';
import { normalizeInstancePath } from './instance-path.js';

describe('normalizeInstancePath', () => {
  it('returns undefined for empty-like inputs', () => {
    expect(normalizeInstancePath()).toBeUndefined();
    expect(normalizeInstancePath(null)).toBeUndefined();
    expect(normalizeInstancePath([])).toBeUndefined();
  });

  it('preserves non-empty instance paths', () => {
    const path = [{ repeatedTemplateId: 'row', instanceKey: '1' }] as const;
    expect(normalizeInstancePath(path)).toBe(path);
  });

  it('passes any non-empty array through untouched (frame validation is the caller\'s job)', () => {
    const frames = [{}] as never;
    expect(normalizeInstancePath(frames)).toBe(frames);
    expect(normalizeInstancePath([{ repeatedTemplateId: 'row' }] as never)).toBeDefined();
  });
});

/**
 * Unit tests for `resolveFormMode` (data-schema-validation.ts).
 *
 * Regression coverage for the mode/layout semantics unification — the prior
 * validator only read `layout`, making the more discoverable `mode` field a
 * no-op for label position control.
 */
import { describe, expect, it } from 'vitest';
import { resolveFormMode } from '../data-schema-validation.js';

describe('resolveFormMode (G-001: CrudQueryFormConfig mode/layout semantics)', () => {
  it('layout=horizontal → mode=horizontal (backward compat)', () => {
    expect(resolveFormMode('horizontal', undefined)).toBe('horizontal');
  });

  it('mode=horizontal → mode=horizontal (new feature, no layout needed)', () => {
    expect(resolveFormMode(undefined, 'horizontal')).toBe('horizontal');
  });

  it('mode=horizontal + layout=vertical → mode=horizontal (mode wins)', () => {
    expect(resolveFormMode('vertical', 'horizontal')).toBe('horizontal');
  });

  it('layout=inline → mode=inline (previously fell through to normal)', () => {
    expect(resolveFormMode('inline', undefined)).toBe('inline');
  });

  it('mode=inline → mode=inline', () => {
    expect(resolveFormMode(undefined, 'inline')).toBe('inline');
  });

  it('mode=vertical → mode=normal (vertical is an alias of normal)', () => {
    expect(resolveFormMode(undefined, 'vertical')).toBe('normal');
    expect(resolveFormMode('horizontal', 'vertical')).toBe('normal'); // mode wins
  });

  it('mode=manual → falls back to layout, defaults to normal', () => {
    // 'manual' is a legacy autoGenerate behavior value, NOT a label position value.
    // It must not be misinterpreted as 'manual' label position (which doesn't exist).
    expect(resolveFormMode(undefined, 'manual')).toBe('normal');
    expect(resolveFormMode('horizontal', 'manual')).toBe('horizontal');
    expect(resolveFormMode('inline', 'manual')).toBe('inline');
  });

  it('mode=auto → falls back to layout, defaults to normal', () => {
    // Same as 'manual' — legacy autoGenerate value, not a label position value.
    expect(resolveFormMode(undefined, 'auto')).toBe('normal');
    expect(resolveFormMode('horizontal', 'auto')).toBe('horizontal');
  });

  it('no mode and no layout → mode=normal (default)', () => {
    expect(resolveFormMode(undefined, undefined)).toBe('normal');
  });

  it('mode=normal explicitly → mode=normal (overrides layout=horizontal)', () => {
    // Explicit 'normal' is still a label position value, so it wins.
    expect(resolveFormMode('horizontal', 'normal')).toBe('normal');
  });

  it('mode=normal overrides layout=vertical (regression: vertical → normal fallback was buggy)', () => {
    expect(resolveFormMode('vertical', 'normal')).toBe('normal');
  });
});
import { describe, expect, it } from 'vitest';
import { normalizeIconName, resolveLucideIcon, toIconLookupKey, toLucideKey } from './icon-utils';

describe('toIconLookupKey', () => {
  it('converts spaces to dashes', () => {
    expect(toIconLookupKey('arrow left')).toBe('arrow-left');
  });

  it('converts underscores to dashes', () => {
    expect(toIconLookupKey('arrow_left')).toBe('arrow-left');
  });

  it('converts to lowercase', () => {
    expect(toIconLookupKey('ArrowLeft')).toBe('arrowleft');
  });

  it('trims whitespace', () => {
    expect(toIconLookupKey('  arrow-left  ')).toBe('arrow-left');
  });

  it('strips fa prefix', () => {
    expect(toIconLookupKey('fa arrow-left')).toBe('arrow-left');
  });

  it('strips fas prefix', () => {
    expect(toIconLookupKey('fas arrow-left')).toBe('arrow-left');
  });

  it('strips far prefix', () => {
    expect(toIconLookupKey('far arrow-left')).toBe('arrow-left');
  });

  it('strips fa-solid prefix', () => {
    expect(toIconLookupKey('fa-solid arrow-left')).toBe('arrow-left');
  });

  it('strips fa-regular prefix', () => {
    expect(toIconLookupKey('fa-regular arrow-left')).toBe('arrow-left');
  });

  it('strips fa-brands prefix', () => {
    expect(toIconLookupKey('fa-brands github')).toBe('github');
  });
});

describe('normalizeIconName', () => {
  it('returns undefined for empty string', () => {
    expect(normalizeIconName('')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeIconName(undefined)).toBeUndefined();
  });

  it('applies toIconLookupKey normalization', () => {
    expect(normalizeIconName('Arrow Left')).toBe('arrow-left');
  });

  it('maps house to home', () => {
    expect(normalizeIconName('house')).toBe('home');
  });

  it('maps language to languages', () => {
    expect(normalizeIconName('language')).toBe('languages');
  });

  it('maps puzzle-piece to puzzle', () => {
    expect(normalizeIconName('puzzle-piece')).toBe('puzzle');
  });

  it('maps gear to settings-2', () => {
    expect(normalizeIconName('gear')).toBe('settings-2');
  });

  it('maps cog to settings-2', () => {
    expect(normalizeIconName('cog')).toBe('settings-2');
  });

  it('returns normalized name when no alias exists', () => {
    expect(normalizeIconName('check')).toBe('check');
  });
});

describe('toLucideKey', () => {
  it('converts dash-separated to PascalCase', () => {
    expect(toLucideKey('arrow-left')).toBe('ArrowLeft');
  });

  it('handles single word', () => {
    expect(toLucideKey('home')).toBe('Home');
  });

  it('handles multiple dashes', () => {
    expect(toLucideKey('chevron-double-left')).toBe('ChevronDoubleLeft');
  });

  it('handles empty parts from multiple dashes', () => {
    expect(toLucideKey('arrow--left')).toBe('ArrowLeft');
  });
});

describe('resolveLucideIcon', () => {
  it('returns Circle for undefined', () => {
    const result = resolveLucideIcon(undefined);
    expect(result.displayName ?? result.name).toMatch(/circle/i);
  });

  it('returns Circle for empty string', () => {
    const result = resolveLucideIcon('');
    expect(result.displayName ?? result.name).toMatch(/circle/i);
  });

  it('returns a component for valid icon name', () => {
    const result = resolveLucideIcon('home');
    expect(result).toBeDefined();
    expect(typeof result === 'function' || typeof result === 'object').toBe(true);
  });

  it('returns Circle for unknown icon', () => {
    const result = resolveLucideIcon('non-existent-icon-xyz');
    expect(result.displayName ?? result.name).toMatch(/circle/i);
  });

  it('applies alias mapping', () => {
    const houseResult = resolveLucideIcon('house');
    const homeResult = resolveLucideIcon('home');
    expect(houseResult).toBe(homeResult);
  });
});

import { describe, expect, it } from 'vitest';
import { scopeChangeHitsDependencies } from '../scope-change';

describe('scopeChangeHitsDependencies', () => {
  it('matches child-path changes against parent-path dependencies', () => {
    expect(scopeChangeHitsDependencies(
      { paths: ['user.name'], sourceScopeId: 'scope', kind: 'update' },
      { paths: ['user'], wildcard: false, broadAccess: false }
    )).toBe(true);
  });

  it('matches parent replacements against child-path dependencies', () => {
    expect(scopeChangeHitsDependencies(
      { paths: ['user'], sourceScopeId: 'scope', kind: 'merge' },
      { paths: ['user.name'], wildcard: false, broadAccess: false }
    )).toBe(true);
  });

  it('invalidates wildcard dependencies for any change', () => {
    expect(scopeChangeHitsDependencies(
      { paths: ['other'], sourceScopeId: 'scope', kind: 'update' },
      { paths: ['*'], wildcard: true, broadAccess: true }
    )).toBe(true);
  });

  it('ignores unrelated paths when dependency set is precise', () => {
    expect(scopeChangeHitsDependencies(
      { paths: ['settings.theme'], sourceScopeId: 'scope', kind: 'update' },
      { paths: ['user.name'], wildcard: false, broadAccess: false }
    )).toBe(false);
  });
});

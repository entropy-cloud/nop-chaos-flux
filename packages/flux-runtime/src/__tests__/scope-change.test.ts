import { describe, expect, it } from 'vitest';
import { createRootDependencySet, filterScopeChangeByIgnoredRoots, scopeChangeHitsDependencies } from '../scope-change';

describe('scopeChangeHitsDependencies', () => {
  it('matches child-path changes against root dependencies', () => {
    expect(scopeChangeHitsDependencies(
      { paths: ['user.name'], sourceScopeId: 'scope', kind: 'update' },
      { paths: ['user'], wildcard: false, broadAccess: false }
    )).toBe(true);
  });

  it('normalizes dependency roots before matching', () => {
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

  it('filters ignored self roots before dependency matching', () => {
    expect(filterScopeChangeByIgnoredRoots(
      { paths: ['payload.total', 'note'], sourceScopeId: 'scope', kind: 'merge' },
      ['payload']
    )).toEqual({
      paths: ['note'],
      sourceScopeId: 'scope',
      kind: 'merge'
    });
  });

  it('builds normalized root dependency sets from explicit roots', () => {
    expect(createRootDependencySet(['user.name', 'filters.status'])).toEqual({
      paths: ['filters', 'user'],
      wildcard: false,
      broadAccess: false
    });
  });
});

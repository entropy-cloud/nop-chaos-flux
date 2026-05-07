import { describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createScopeRef, createScopeStore } from '../scope.js';

function createTestScope(data: Record<string, any>): ScopeRef {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data),
  });
}

function createChildScope(parent: ScopeRef, ownData: Record<string, any>): ScopeRef {
  return createScopeRef({
    id: 'child-scope',
    path: 'child',
    parent,
    store: createScopeStore(ownData),
  });
}

describe('DANGEROUS_KEYS filtering', () => {
  it('filters __proto__, constructor, and prototype from merge', () => {
    const scope = createTestScope({ a: 1 });
    scope.merge({ constructor: 'x', __proto__: {}, prototype: 'y', b: 2 });

    expect(scope.readOwn()).toEqual({ a: 1, b: 2 });
  });

  it('filters __proto__, constructor, and prototype from replace', () => {
    const scope = createTestScope({ a: 1 });
    scope.replace?.({ constructor: 'x', __proto__: {}, prototype: 'y', b: 2 });

    expect(scope.readOwn()).toEqual({ b: 2 });
  });

  it('skips update when path head is a dangerous key', () => {
    const scope = createTestScope({ a: 1 });
    scope.update('constructor', 'x');
    scope.update('__proto__.polluted', 'yes');
    scope.update('prototype', 'bad');

    expect(scope.readOwn()).toEqual({ a: 1 });
  });

  it('allows update with non-dangerous keys', () => {
    const scope = createTestScope({ a: 1 });
    scope.update('b', 2);

    expect(scope.readOwn()).toEqual({ a: 1, b: 2 });
  });

  it('filters dangerous keys from readVisible in child scope', () => {
    const parent = createTestScope({ a: 1, constructor: 'p', prototype: 'q' });
    const child = createChildScope(parent, { b: 2, __proto__: {} });

    const visible = child.readVisible();
    expect(visible.a).toBe(1);
    expect(visible.b).toBe(2);
    expect(Object.prototype.hasOwnProperty.call(visible, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(visible, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(visible, 'prototype')).toBe(false);
  });

  it('filters dangerous keys from materializeVisible in child scope', () => {
    const parent = createTestScope({ a: 1, constructor: 'p', prototype: 'q' });
    const child = createChildScope(parent, { b: 2, __proto__: {} });

    const materialized = child.materializeVisible();
    expect(materialized).toEqual({ a: 1, b: 2 });
    expect(Object.prototype.hasOwnProperty.call(materialized, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(materialized, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(materialized, 'prototype')).toBe(false);
  });

  it('filters dangerous keys from readVisible in root scope', () => {
    const scope = createTestScope({ a: 1, constructor: 'x', __proto__: {}, prototype: 'y' });
    const visible = scope.readVisible();

    expect(visible.a).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(visible, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(visible, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(visible, 'prototype')).toBe(false);
  });
});

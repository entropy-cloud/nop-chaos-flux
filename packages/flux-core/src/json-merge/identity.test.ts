import { describe, expect, it } from 'vitest';
import { classifyList, identityCompositeKey, readIdentity } from './identity.js';
import { resolveContext, joinPath, DEFAULT_OVERRIDE_KEY, DEFAULT_VIRTUAL_KEY } from './types.js';

describe('readIdentity', () => {
  it('prefers id over name', () => {
    expect(readIdentity({ id: 'a', name: 'b' })).toEqual({ key: 'id', value: 'a' });
  });

  it('falls back to name when id is absent', () => {
    expect(readIdentity({ name: 'b' })).toEqual({ key: 'name', value: 'b' });
  });

  it('prefers xui:id over id and name', () => {
    expect(readIdentity({ 'xui:id': 'x', id: 'a', name: 'b' })).toEqual({
      key: 'xui:id',
      value: 'x',
    });
  });

  it('resolves identity through the unique-attr indirection', () => {
    expect(readIdentity({ 'xui:unique-attr': 'code', code: 'C1' })).toEqual({
      key: 'code',
      value: 'C1',
    });
  });

  it('ignores unique-attr when the referenced key is missing', () => {
    expect(readIdentity({ 'xui:unique-attr': 'code' })).toBeUndefined();
  });

  it('honours a custom identity key chain order', () => {
    const options = { identityKeys: ['code', 'id', 'name'] } as const;
    expect(readIdentity({ code: 'C1', id: 'a' }, options)).toEqual({ key: 'code', value: 'C1' });
    expect(readIdentity({ id: 'a', name: 'b' }, options)).toEqual({ key: 'id', value: 'a' });
  });

  it('treats empty and null identity values as absent', () => {
    expect(readIdentity({ id: '' })).toBeUndefined();
    expect(readIdentity({ id: null })).toBeUndefined();
    expect(readIdentity({ id: undefined })).toBeUndefined();
  });

  it('ignores non-scalar identity values', () => {
    expect(readIdentity({ id: { nested: true } })).toBeUndefined();
    expect(readIdentity({ id: ['a'] })).toBeUndefined();
  });

  it('stringifies numeric and boolean identity values', () => {
    expect(readIdentity({ id: 7 })).toEqual({ key: 'id', value: '7' });
    expect(readIdentity({ id: false })).toEqual({ key: 'id', value: 'false' });
  });

  it('returns undefined for non-record input', () => {
    expect(readIdentity('a')).toBeUndefined();
    expect(readIdentity(null)).toBeUndefined();
    expect(readIdentity([{ id: 'a' }])).toBeUndefined();
  });
});

describe('classifyList', () => {
  it('reports none for an empty list', () => {
    expect(classifyList([])).toBe('none');
  });

  it('reports none when no element carries identity', () => {
    expect(classifyList([{ label: 'a' }, { label: 'b' }])).toBe('none');
  });

  it('reports all when every element carries identity', () => {
    expect(classifyList([{ id: 'a' }, { id: 'b' }])).toBe('all');
  });

  it('reports some when only part of the elements carry identity', () => {
    expect(classifyList([{ id: 'a' }, { label: 'b' }])).toBe('some');
  });

  it('reports all when identity comes from name', () => {
    expect(classifyList([{ name: 'a' }, { name: 'b' }])).toBe('all');
  });

  it('honours a custom identity key chain', () => {
    const list = [{ code: 'C1' }, { label: 'x' }];
    expect(classifyList(list)).toBe('none');
    expect(classifyList(list, { identityKeys: ['code', 'name'] })).toBe('some');
  });
});

describe('resolveContext', () => {
  it('fills every option from defaults when called bare', () => {
    const c = resolveContext();
    expect(Array.isArray(c.identityKeys) && c.identityKeys.length > 0).toBe(true);
    expect(typeof c.uniqueAttrKey).toBe('string');
    expect(c.overrideKey).toBe(DEFAULT_OVERRIDE_KEY);
    expect(c.virtualKey).toBe(DEFAULT_VIRTUAL_KEY);
    expect(c.forcePrefix).toBeUndefined();
  });

  it('overrides win verbatim (markers split into override/virtual)', () => {
    const c = resolveContext({
      identityKeys: ['sku'],
      uniqueAttrKey: 'data-id',
      markers: { override: 'my:override', virtual: 'my:virtual' },
      forceOverridePrefix: '!',
    });
    expect(c.identityKeys).toEqual(['sku']);
    expect(c.uniqueAttrKey).toBe('data-id');
    expect(c.overrideKey).toBe('my:override');
    expect(c.virtualKey).toBe('my:virtual');
    expect(c.forcePrefix).toBe('!');
  });
});

describe('joinPath', () => {
  it('joins with / and escapes RFC6901 tokens (~0 ~1)', () => {
    expect(joinPath('', 'a')).toBe('/a');
    expect(joinPath('/root', 'child')).toBe('/root/child');
    expect(joinPath('', 'a/b')).toBe('/a~1b');
    expect(joinPath('', 'a~b')).toBe('/a~0b');
    expect(joinPath('', 'a~1b')).toBe('/a~01b');
  });

  it('treats numeric tokens as segments (stringified, not indices)', () => {
    expect(joinPath('/list', 0)).toBe('/list/0');
    expect(joinPath('/list', 12)).toBe('/list/12');
  });
});

describe('identityCompositeKey', () => {
  it('uniqueAttrKey is an indirection to the identity KEY NAME and wins over the chain', () => {
    // unique-attr carries the NAME of the key that holds identity, not the identity itself
    const c = resolveContext({ identityKeys: ['id'], uniqueAttrKey: 'data-id' });
    expect(identityCompositeKey({ 'data-id': 'id', id: 'B' }, c)).toBe('id\u0000B');
    expect(identityCompositeKey({ 'data-id': 'name', id: 'B', name: 'N' }, c)).toBe('name\u0000N');
    // the default uniqueAttrKey is `xui:unique-attr`, so `data-id` is not consulted there
    expect(identityCompositeKey({ 'data-id': 'id', id: 'B' }, resolveContext({ identityKeys: ['id'] }))).toBe('id\u0000B');
    // dangling indirection (points at a missing key) yields no identity
    expect(identityCompositeKey({ 'data-id': 'missing', id: 'B' }, c)).toBeUndefined();
  });

  it('walks the identityKeys chain in order and stops at the first carrier', () => {
    const c = resolveContext({ identityKeys: ['sku', 'code'] });
    expect(identityCompositeKey({ code: 'C1', sku: 'S1' }, c)).toBe('sku\u0000S1');
    expect(identityCompositeKey({ code: 'C1' }, c)).toBe('code\u0000C1');
  });

  it('empty string, null, undefined and objects carry no identity', () => {
    const c = resolveContext({ identityKeys: ['id'] });
    expect(identityCompositeKey({ id: '' }, c)).toBeUndefined();
    expect(identityCompositeKey({ id: null }, c)).toBeUndefined();
    expect(identityCompositeKey({ id: undefined }, c)).toBeUndefined();
    expect(identityCompositeKey({ id: { nested: true } }, c)).toBeUndefined();
    expect(identityCompositeKey({}, c)).toBeUndefined();
  });

  it('readIdentity uses the toString-tag plain-object check: class instances read, Dates do not', () => {
    const c = resolveContext({ identityKeys: ['id'] });
    expect(identityCompositeKey(new Date(), c)).toBeUndefined();
    // unlike json-merge's own isJsonObject (prototype-chain, used by diff/merge),
    // the identity read path accepts any `[object Object]` — including class instances
    class Row {
      id = 'R1';
    }
    expect(identityCompositeKey(new Row(), c)).toBe('id\u0000R1');
    expect(identityCompositeKey(Object.create(null, { id: { value: 'N1' } }), c)).toBe('id\u0000N1');
    expect(identityCompositeKey(['id'], c)).toBeUndefined();
  });

  it('a non-string uniqueAttr carrier is rejected (indirect key must be scalar-string)', () => {
    const c = resolveContext({ identityKeys: ['id'], uniqueAttrKey: 'data-id' });
    expect(identityCompositeKey({ 'data-id': { nope: 1 }, id: 'B' }, c)).toBe('id\u0000B');
    expect(identityCompositeKey({ 'data-id': '' }, c)).toBeUndefined();
  });

  it('stringifies numeric identity values into the composite key', () => {
    const c = resolveContext({ identityKeys: ['id'] });
    expect(identityCompositeKey({ id: 42 }, c)).toBe('id\u000042');
  });
});
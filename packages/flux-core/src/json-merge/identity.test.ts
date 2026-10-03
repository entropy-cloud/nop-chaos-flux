import { describe, expect, it } from 'vitest';
import { classifyList, readIdentity } from './identity.js';

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
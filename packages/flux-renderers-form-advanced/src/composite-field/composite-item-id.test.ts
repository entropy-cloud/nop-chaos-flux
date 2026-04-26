import { describe, expect, it } from 'vitest';
import { createNextCompositeItemId } from './composite-item-id';

describe('createNextCompositeItemId', () => {
  it('generates next id starting from length + 1', () => {
    expect(createNextCompositeItemId([], 'item-')).toBe('item-1');
  });

  it('generates sequential id for empty array', () => {
    expect(createNextCompositeItemId([], 'pair-')).toBe('pair-1');
  });

  it('generates id after existing items', () => {
    const items = [{ id: 'item-1' }, { id: 'item-2' }];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-3');
  });

  it('skips ids that are already used when starting from length+1', () => {
    const items = [{ id: 'item-1' }, { id: 'item-2' }, { id: 'item-3' }];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-4');
  });

  it('skips past occupied slot at length+1', () => {
    const items = [{ id: 'item-1' }, { id: 'item-3' }];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-4');
  });

  it('handles items without id - counts toward length but not used set', () => {
    const items = [{ id: 'item-1' }, {}, { id: undefined }];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-4');
  });

  it('handles items with empty string id', () => {
    const items = [{ id: 'item-1' }, { id: '' }];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-3');
  });

  it('works with different prefixes', () => {
    const items = [{ id: 'pair-1' }, { id: 'pair-2' }];
    expect(createNextCompositeItemId(items, 'pair-')).toBe('pair-3');
  });

  it('finds next available when all sequential up to length', () => {
    const items = [{ id: 'item-1' }, { id: 'item-2' }, { id: 'item-4' }, { id: 'item-5' }];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-6');
  });

  it('handles single item array', () => {
    const items = [{ id: 'item-1' }];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-2');
  });

  it('handles all items without ids', () => {
    const items = [{}, {}, {}];
    expect(createNextCompositeItemId(items, 'item-')).toBe('item-4');
  });
});

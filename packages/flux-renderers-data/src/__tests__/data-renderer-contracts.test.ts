import { describe, expect, it } from 'vitest';
import { resolveRendererEventContracts } from '@nop-chaos/flux-core';
import { dataRendererDefinitions } from '../index.js';

describe('data renderer static contracts', () => {
  it('declares crud as a flux-owner renderer with scope exports and component capabilities', () => {
    const crud = dataRendererDefinitions.find((definition) => definition.type === 'crud');

    expect(crud?.rendererClass).toBe('flux-owner-renderer');
    expect(crud?.rendererTraits).toContain('composite');
    expect(crud?.scopeExportContracts?.$crud?.kind).toBe('object');
    expect(crud?.componentCapabilityContracts?.map((item) => item.handle)).toEqual([
      'refresh',
      'querySubmit',
      'queryReset',
      'getSelection',
      'clearSelection',
      'toggleSelection',
      'loadMore',
    ]);
    expect(resolveRendererEventContracts(crud!).onSelectionChange?.payload?.kind).toBe('object');
  });
});

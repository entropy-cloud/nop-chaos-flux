import { describe, expect, it } from 'vitest';
import { dataRendererDefinitions } from '../index.js';

describe('data renderer static contracts', () => {
  it('declares crud as a flux-owner renderer with scope exports and component capabilities', () => {
    const crud = dataRendererDefinitions.find((definition) => definition.type === 'crud');

    expect(crud?.rendererClass).toBe('flux-owner-renderer');
    expect(crud?.rendererTraits).toContain('composite');
    expect(crud?.scopeExportContracts?.$crud?.kind).toBe('object');
    expect(crud?.componentCapabilityContracts?.map((item) => item.handle)).toEqual([
      'refresh',
      'getSelection',
      'clearSelection',
    ]);
    expect(crud?.eventContracts?.onSelectionChange?.payload?.kind).toBe('object');
  });
});

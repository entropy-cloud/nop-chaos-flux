import { describe, expect, it } from 'vitest';
import { fieldsetRendererDefinition } from '../renderers/fieldset';

describe('fieldset renderer static contracts', () => {
  it('declares fieldset with correct type, regions, and no scope policy', () => {
    expect(fieldsetRendererDefinition.type).toBe('fieldset');
    expect(fieldsetRendererDefinition.regions).toEqual(['body']);
    expect(fieldsetRendererDefinition.scopePolicy).toBeUndefined();
    expect(fieldsetRendererDefinition.defaultSchema).toEqual({ type: 'fieldset', body: [] });
  });
});

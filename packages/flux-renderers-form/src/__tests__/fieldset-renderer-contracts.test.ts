import { describe, expect, it } from 'vitest';
import { fieldsetRendererDefinition } from '../renderers/fieldset.js';

describe('fieldset renderer static contracts', () => {
  it('declares fieldset with correct type, field metadata, and no scope policy', () => {
    expect(fieldsetRendererDefinition.type).toBe('fieldset');
    expect(fieldsetRendererDefinition.fields).toEqual([
      { key: 'collapsible', kind: 'prop', valueType: 'boolean' },
      { key: 'collapsed', kind: 'prop', valueType: 'boolean' },
      { key: 'body', kind: 'region', regionKey: 'body' },
    ]);
    expect(fieldsetRendererDefinition.scopePolicy).toBeUndefined();
    expect(fieldsetRendererDefinition.defaultSchema).toEqual({ type: 'fieldset', body: [] });
  });
});

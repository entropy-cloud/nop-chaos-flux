import { describe, expect, it } from 'vitest';
import { fieldsetRendererDefinition } from '../renderers/fieldset.js';

describe('fieldset renderer static contracts', () => {
  it('declares fieldset with correct type, field metadata, and no scope policy', () => {
    expect(fieldsetRendererDefinition.type).toBe('fieldset');
    // RM-4 (plan 606): prop contracts absorbed into fields entries — the
    // key/kind/valueType surface is unchanged, title/collapsible/collapsed
    // now carry their contracts inline.
    expect(fieldsetRendererDefinition.fields).toEqual([
      { key: 'title', kind: 'prop', contract: expect.any(Object) },
      { key: 'collapsible', kind: 'prop', valueType: 'boolean', contract: expect.any(Object) },
      { key: 'collapsed', kind: 'prop', valueType: 'boolean', contract: expect.any(Object) },
      { key: 'columnCount', kind: 'prop', contract: expect.any(Object) },
      { key: 'gap', kind: 'prop', contract: expect.any(Object) },
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'bodyClassName', kind: 'prop', contract: expect.any(Object) },
      { key: 'titleClassName', kind: 'prop', contract: expect.any(Object) },
    ]);
    expect(fieldsetRendererDefinition.scopePolicy).toBeUndefined();
    expect(fieldsetRendererDefinition.defaultSchema).toEqual({ type: 'fieldset', body: [] });
  });

  it('fieldset with columnCount property', () => {
    expect({ type: 'fieldset', columnCount: 2, body: [] }).toHaveProperty('columnCount');
  });
});

import { describe, expect, it } from 'vitest';
import { formRendererDefinition } from '../renderers/form.js';

describe('form renderer static contracts', () => {
  it('declares form as a flux-owner renderer with scope exports and component capabilities', () => {
    expect(formRendererDefinition.rendererClass).toBe('flux-owner-renderer');
    expect(formRendererDefinition.rendererTraits).toContain('semantic-owner');
    expect(formRendererDefinition.scopeExportContracts?.$form?.kind).toBe('object');
    expect(formRendererDefinition.componentCapabilityContracts?.map((item) => item.handle)).toEqual(
      ['submit', 'validate', 'reset', 'setValue', 'setValues', 'getValues'],
    );
    expect(formRendererDefinition.eventContracts?.submitAction?.displayName).toBe('Submit');
  });
});

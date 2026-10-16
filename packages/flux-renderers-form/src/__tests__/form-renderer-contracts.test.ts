import { describe, expect, it } from 'vitest';
import { resolveRendererEventContracts } from '@nop-chaos/flux-core';
import { formRendererDefinition } from '../renderers/form-definition.js';

describe('form renderer static contracts', () => {
  it('declares form as a flux-owner renderer with scope exports and component capabilities', () => {
    expect(formRendererDefinition.rendererClass).toBe('flux-owner-renderer');
    expect(formRendererDefinition.rendererTraits).toContain('semantic-owner');
    // RM-6: scope exports derive from the injectedLocals entry's inline shape
    expect(formRendererDefinition.injectedLocals?.$form?.shape?.kind).toBe('object');
    expect(formRendererDefinition.componentCapabilityContracts?.map((item) => item.handle)).toEqual(
      ['submit', 'refresh', 'validate', 'reset', 'setValue', 'setValues', 'getValues'],
    );
    expect(resolveRendererEventContracts(formRendererDefinition).submitAction?.displayName).toBe('Submit');
  });
});

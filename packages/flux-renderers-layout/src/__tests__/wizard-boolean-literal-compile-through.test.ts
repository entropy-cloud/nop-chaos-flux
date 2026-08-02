import { describe, expect, it } from 'vitest';
import type { FluxSchemaDefinitionShape } from '@nop-chaos/flux-core';
import { layoutRendererDefinitions } from '../layout-renderer-definitions.js';
import { isStepDisabled } from '../wizard-renderer.js';

function getWizardStepsShape(): FluxSchemaDefinitionShape {
  const wizardDef = layoutRendererDefinitions.find((def) => def.type === 'wizard');
  const stepsContract = wizardDef?.propContracts?.steps;
  const shape = stepsContract?.shape;
  if (shape?.kind !== 'array' || shape.item.kind !== 'schema-definition') {
    throw new Error('wizard steps propContract schema-definition not found in production definitions');
  }
  return shape.item;
}

describe('wizard step.disabled — compile-through boolean-literal contract (unified pipeline)', () => {
  it('production propContracts declares steps.disabled as literal kind (envelope auto-wrapping)', () => {
    const itemShape = getWizardStepsShape();

    // disabled → literal: the compiler auto-wraps into __nopPreserveLiteral.
    expect(itemShape.fieldRules.disabled).toBe('literal');

    // title → value-or-region; body/actions → region with params preserved.
    expect(itemShape.fieldRules.title).toEqual(
      expect.objectContaining({
        kind: 'value-or-region',
        regionKey: 'titleRegionKey',
        params: ['step', 'index', 'key'],
      }),
    );
    expect(itemShape.fieldRules.body).toEqual(
      expect.objectContaining({
        kind: 'region',
        regionKey: 'bodyRegionKey',
        params: ['step', 'index', 'key'],
      }),
    );
    expect(itemShape.fieldRules.actions).toEqual(
      expect.objectContaining({
        kind: 'region',
        regionKey: 'actionsRegionKey',
        params: ['step', 'index', 'key'],
      }),
    );
  });

  it('isStepDisabled resolves the compiler-produced envelope (renderer-side unwrap)', () => {
    // Contract: after the migration, the renderer must treat the compiler-emitted
    // `{__nopPreserveLiteral:true, value:true}` envelope as a disabled step.
    expect(isStepDisabled({ disabled: { __nopPreserveLiteral: true, value: true } } as never)).toBe(true);
    expect(isStepDisabled({ disabled: { __nopPreserveLiteral: true, value: false } } as never)).toBe(false);
    expect(isStepDisabled({ disabled: true } as never)).toBe(true);
    expect(isStepDisabled({ disabled: false } as never)).toBe(false);
    expect(isStepDisabled({ disabled: 'true' } as never)).toBe(true);
  });
});

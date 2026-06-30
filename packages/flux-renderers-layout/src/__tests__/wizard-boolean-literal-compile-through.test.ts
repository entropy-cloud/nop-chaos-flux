import { describe, expect, it } from 'vitest';
import type {
  CompileSchemaOptions,
  SchemaInput,
  TemplateNode,
  TemplateRegion,
} from '@nop-chaos/flux-core';
import { layoutRendererDefinitions } from '../layout-renderer-definitions.js';
import { isStepDisabled } from '../wizard-renderer.js';

function createMockCompileSchema(): (
  input: SchemaInput,
  options?: CompileSchemaOptions,
) => TemplateNode | TemplateNode[] {
  return (_input: SchemaInput, _options?: CompileSchemaOptions) =>
    ({ type: 'text', text: 'mock' }) as unknown as TemplateNode;
}

function getWizardStepsNormalize() {
  const wizardDef = layoutRendererDefinitions.find((def) => def.type === 'wizard');
  const stepsDeepField = wizardDef?.deepFields?.find((field) => field.key === 'steps');
  const normalize = stepsDeepField?.normalize;
  if (typeof normalize !== 'function') {
    throw new Error('wizard steps deepField.normalize not found in production definitions');
  }
  return normalize;
}

describe('wizard step.disabled — compile-through boolean-literal contract', () => {
  it('production deepField.normalize wraps authored step.disabled into __nopPreserveLiteral envelope', () => {
    const normalize = getWizardStepsNormalize();
    const regions: Record<string, TemplateRegion> = {};
    const compileSchema = createMockCompileSchema();

    const result = normalize({
      value: [
        { title: 'A', disabled: true },
        { title: 'B', disabled: false },
      ],
      path: '$.steps',
      regions,
      compileSchema,
    }) as Record<string, unknown>[];

    expect(result[0].disabled).toEqual({ __nopPreserveLiteral: true, value: true });
    expect(result[1].disabled).toEqual({ __nopPreserveLiteral: true, value: false });
  });

  it('isStepDisabled resolves the compiler-produced envelope (renderer-side unwrap)', () => {
    const normalize = getWizardStepsNormalize();
    const regions: Record<string, TemplateRegion> = {};
    const compileSchema = createMockCompileSchema();

    const result = normalize({
      value: [
        { title: 'A', disabled: true },
        { title: 'B', disabled: false },
      ],
      path: '$.steps',
      regions,
      compileSchema,
    }) as unknown as { disabled: unknown }[];

    // Contract: after the fix, the renderer must treat the compiler-emitted
    // `{__nopPreserveLiteral:true, value:true}` envelope as a disabled step.
    // RED before the fix (isStepDisabled compared only bare literals and
    // returned false for the envelope object).
    expect(isStepDisabled(result[0] as never)).toBe(true);
    expect(isStepDisabled(result[1] as never)).toBe(false);
  });
});

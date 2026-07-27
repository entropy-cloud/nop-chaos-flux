import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { formRenderer, inputRenderer, env } from './test-fixtures.js';

describe('validation compile→runtime interop', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
  const registry = createRendererRegistry([formRenderer, inputRenderer]);

  it('compiles a schema with validation rules and runs them through the runtime pipeline', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const compiled = runtime.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'email', label: 'Email', required: true },
        { type: 'input-text', name: 'confirm', label: 'Confirm', equalsField: 'email' },
      ],
    });
    const node = (Array.isArray(compiled.root) ? compiled.root[0] : compiled.root) as any;
    expect(node.validationPlan).toBeDefined();
    expect(node.validationPlan.nodes.email.rules[0].rule.kind).toBe('required');
    expect(node.validationPlan.nodes.confirm.rules[0].rule).toMatchObject({
      kind: 'equalsField',
      path: 'email',
    });

    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'test-form',
      initialValues: { email: 'a@example.com', confirm: 'b@example.com' },
      parentScope: page.scope,
      validation: node.validationPlan,
    });

    const result = await form.submit();
    expect(result.ok).toBe(false);
    expect(form.getError('confirm')?.[0]?.rule).toBe('equalsField');
  });

  it('passes validation when compiled rules are satisfied at runtime', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const compiled = runtime.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'email', label: 'Email', required: true },
      ],
    });
    const node = (Array.isArray(compiled.root) ? compiled.root[0] : compiled.root) as any;

    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'valid-form',
      initialValues: { email: 'a@example.com' },
      parentScope: page.scope,
      validation: node.validationPlan,
    });

    const result = await form.submit();
    expect(result.ok).toBe(true);
  });

  it('propagates validation errors through store subscriptions', async () => {
    const runtime = createRendererRuntime({ registry, env, expressionCompiler });
    const compiled = runtime.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'code', label: 'Code', required: true },
      ],
    });
    const node = (Array.isArray(compiled.root) ? compiled.root[0] : compiled.root) as any;
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'sub-form',
      initialValues: {},
      parentScope: page.scope,
      validation: node.validationPlan,
    });

    expect(form.getError('code')).toBeUndefined();
    await form.submit();
    expect(form.getError('code')).toHaveLength(1);
    expect(form.getError('code')![0].rule).toBe('required');
    expect(form.store.getState().fieldStates.code?.errors).toHaveLength(1);
  });
});

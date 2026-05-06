import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import '../test-dom-polyfills';
import type {
  ApiSchema,
  ApiRequestContext,
  RendererDefinition,
  RendererEnv,
  FormRuntime,
  SchemaInput,
} from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentForm } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';

const sharedFormulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_api: ApiSchema, ctx: ApiRequestContext) {
    return {
      ok: true,
      status: 200,
      data: ctx.scope.readOwn() as T,
    };
  },
  notify: () => undefined,
};

beforeEach(() => {
  cleanup();
});

async function renderWithFormProbe(schema: SchemaInput): Promise<FormRuntime> {
  let capturedForm: FormRuntime | undefined;

  function FormProbe() {
    const form = useCurrentForm();
    React.useEffect(() => {
      capturedForm = form;
    }, [form]);
    return null;
  }

  const formProbeRenderer: RendererDefinition = {
    type: 'form-probe',
    component: FormProbe,
  };

  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formProbeRenderer]);

  await act(async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://form/hidden-field-policy"
        formulaCompiler={sharedFormulaCompiler}
        env={env}
        schema={schema}
      />,
    );
  });

  expect(capturedForm).toBeDefined();
  return capturedForm!;
}

describe('hidden field policy - renderer integration', () => {
  it('form runtime is accessible via useCurrentForm probe', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      body: [{ type: 'input-text', name: 'email' }, { type: 'form-probe' }],
    });

    expect(typeof capturedForm.notifyFieldHidden).toBe('function');
  });

  it('notifyFieldHidden(path, true) causes validateForm to skip that field', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      body: [{ type: 'input-text', name: 'email', required: true }, { type: 'form-probe' }],
    });

    act(() => {
      capturedForm.notifyFieldHidden('email', true);
    });

    const result = await act(async () => capturedForm.validateForm());
    expect(result.ok).toBe(true);
    expect(Object.keys(result.fieldErrors)).not.toContain('email');
  });

  it('notifyFieldHidden(path, false) restores field validation participation', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      body: [{ type: 'input-text', name: 'email', required: true }, { type: 'form-probe' }],
    });

    act(() => {
      capturedForm.notifyFieldHidden('email', true);
    });

    act(() => {
      capturedForm.notifyFieldHidden('email', false);
    });

    const result = await act(async () => capturedForm.validateForm());
    expect(result.ok).toBe(false);
    expect(Object.keys(result.fieldErrors)).toContain('email');
  });

  it('form with validateWhenHidden=true in hiddenFieldPolicy validates hidden required field', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      hiddenFieldPolicy: { validateWhenHidden: true },
      body: [{ type: 'input-text', name: 'email', required: true }, { type: 'form-probe' }],
    });

    act(() => {
      capturedForm.notifyFieldHidden('email', true);
    });

    const result = await act(async () => capturedForm.validateForm());
    expect(result.ok).toBe(false);
    expect(Object.keys(result.fieldErrors)).toContain('email');
  });

  it('clearValueWhenHidden field loses value on notifyFieldHidden(path, true)', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      data: { email: 'initial@test.com' },
      body: [
        {
          type: 'input-text',
          name: 'email',
          hiddenFieldPolicy: { clearValueWhenHidden: true },
        },
        { type: 'form-probe' },
      ],
    });

    expect(capturedForm.scope.get('email')).toBe('initial@test.com');

    act(() => {
      capturedForm.notifyFieldHidden('email', true);
    });

    expect(capturedForm.scope.get('email')).toBeUndefined();
  });

  it('default hidden field (no policy) keeps value when hidden', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      data: { notes: 'preserved note' },
      body: [{ type: 'input-text', name: 'notes' }, { type: 'form-probe' }],
    });

    expect(capturedForm.scope.get('notes')).toBe('preserved note');

    act(() => {
      capturedForm.notifyFieldHidden('notes', true);
    });

    expect(capturedForm.scope.get('notes')).toBe('preserved note');
  });

});

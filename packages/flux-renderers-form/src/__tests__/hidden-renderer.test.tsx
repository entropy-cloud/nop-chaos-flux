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
import { formRendererDefinitions } from '../index.js';

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
        schemaUrl="test://form/hidden-renderer"
        formulaCompiler={sharedFormulaCompiler}
        env={env}
        schema={schema}
      />,
    );
  });

  expect(capturedForm).toBeDefined();
  return capturedForm!;
}

describe('hidden renderer', () => {
  it('renders an input[type=hidden] without visible field chrome', async () => {
    await renderWithFormProbe({
      type: 'form',
      body: [
        { type: 'input-text', name: 'visibleField' },
        { type: 'hidden', name: 'invisibleField', value: 'seed' },
        { type: 'form-probe' },
      ],
    });

    const hiddenInput = document.querySelector(
      'input[type="hidden"][data-slot="hidden-input"]',
    ) as HTMLInputElement | null;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput?.name).toBe('invisibleField');
    expect(hiddenInput?.value).toBe('seed');

    expect(document.querySelector('[data-slot="field-label"]')).toBeNull();
    expect(document.querySelectorAll('input[type="hidden"]')).toHaveLength(1);
  });

  it('seeds the initial value into the form scope', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      data: { orderId: 'A100' },
      body: [{ type: 'hidden', name: 'orderId' }, { type: 'form-probe' }],
    });

    expect(capturedForm.scope.get('orderId')).toBe('A100');
  });

  it('clearValueWhenHidden policy clears the scope value on notify', async () => {
    const capturedForm = await renderWithFormProbe({
      type: 'form',
      data: { tenantId: 'T1' },
      body: [
        {
          type: 'hidden',
          name: 'tenantId',
          hiddenFieldPolicy: { clearValueWhenHidden: true },
        },
        { type: 'form-probe' },
      ],
    });

    expect(capturedForm.scope.get('tenantId')).toBeUndefined();
  });
});

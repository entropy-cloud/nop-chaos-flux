import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import type {
  ApiSchema,
  ApiRequestContext,
  RendererDefinition,
  RendererEnv,
  FormRuntime,
} from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentForm } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(
      type: string,
      props: MouseEventInit & { pointerId?: number; pressure?: number } = {},
    ) {
      super(type, props);
    }
  }
  globalThis.PointerEvent = PointerEvent as any;
}

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

beforeEach(() => {
  cleanup();
  capturedForm = undefined;
});

describe('hidden field policy - renderer integration', () => {
  it('form runtime is accessible via useCurrentForm probe', async () => {
    await act(async () => {
      render(
        <SchemaRenderer
          schemaUrl="test://form/hidden-field-policy"
          formulaCompiler={sharedFormulaCompiler}
          env={env}
          schema={{
            type: 'form',
            body: [{ type: 'input-text', name: 'email' }, { type: 'form-probe' }],
          }}
        />,
      );
    });

    expect(capturedForm).toBeDefined();
    expect(typeof capturedForm!.notifyFieldHidden).toBe('function');
  });

  it('notifyFieldHidden(path, true) causes validateForm to skip that field', async () => {
    await act(async () => {
      render(
        <SchemaRenderer
          schemaUrl="test://form/hidden-field-policy"
          formulaCompiler={sharedFormulaCompiler}
          env={env}
          schema={{
            type: 'form',
            body: [{ type: 'input-text', name: 'email', required: true }, { type: 'form-probe' }],
          }}
        />,
      );
    });

    expect(capturedForm).toBeDefined();

    act(() => {
      capturedForm!.notifyFieldHidden('email', true);
    });

    const result = await act(async () => capturedForm!.validateForm());
    expect(result.ok).toBe(true);
    expect(Object.keys(result.fieldErrors)).not.toContain('email');
  });

  it('notifyFieldHidden(path, false) restores field validation participation', async () => {
    await act(async () => {
      render(
        <SchemaRenderer
          schemaUrl="test://form/hidden-field-policy"
          formulaCompiler={sharedFormulaCompiler}
          env={env}
          schema={{
            type: 'form',
            body: [{ type: 'input-text', name: 'email', required: true }, { type: 'form-probe' }],
          }}
        />,
      );
    });

    expect(capturedForm).toBeDefined();

    act(() => {
      capturedForm!.notifyFieldHidden('email', true);
    });

    act(() => {
      capturedForm!.notifyFieldHidden('email', false);
    });

    const result = await act(async () => capturedForm!.validateForm());
    expect(result.ok).toBe(false);
    expect(Object.keys(result.fieldErrors)).toContain('email');
  });

  it('form with validateWhenHidden=true in hiddenFieldPolicy validates hidden required field', async () => {
    await act(async () => {
      render(
        <SchemaRenderer
          schemaUrl="test://form/hidden-field-policy"
          formulaCompiler={sharedFormulaCompiler}
          env={env}
          schema={{
            type: 'form',
            hiddenFieldPolicy: { validateWhenHidden: true },
            body: [{ type: 'input-text', name: 'email', required: true }, { type: 'form-probe' }],
          }}
        />,
      );
    });

    expect(capturedForm).toBeDefined();

    act(() => {
      capturedForm!.notifyFieldHidden('email', true);
    });

    const result = await act(async () => capturedForm!.validateForm());
    expect(result.ok).toBe(false);
    expect(Object.keys(result.fieldErrors)).toContain('email');
  });

  it('clearValueWhenHidden field loses value on notifyFieldHidden(path, true)', async () => {
    await act(async () => {
      render(
        <SchemaRenderer
          schemaUrl="test://form/hidden-field-policy"
          formulaCompiler={sharedFormulaCompiler}
          env={env}
          schema={{
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
          }}
        />,
      );
    });

    expect(capturedForm).toBeDefined();
    expect(capturedForm!.scope.get('email')).toBe('initial@test.com');

    act(() => {
      capturedForm!.notifyFieldHidden('email', true);
    });

    expect(capturedForm!.scope.get('email')).toBeUndefined();
  });

  it('default hidden field (no policy) keeps value when hidden', async () => {
    await act(async () => {
      render(
        <SchemaRenderer
          schemaUrl="test://form/hidden-field-policy"
          formulaCompiler={sharedFormulaCompiler}
          env={env}
          schema={{
            type: 'form',
            data: { notes: 'preserved note' },
            body: [{ type: 'input-text', name: 'notes' }, { type: 'form-probe' }],
          }}
        />,
      );
    });

    expect(capturedForm).toBeDefined();
    expect(capturedForm!.scope.get('notes')).toBe('preserved note');

    act(() => {
      capturedForm!.notifyFieldHidden('notes', true);
    });

    expect(capturedForm!.scope.get('notes')).toBe('preserved note');
  });
});

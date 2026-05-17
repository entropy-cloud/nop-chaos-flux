import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ApiSchema,
  ApiRequestContext,
  RendererDefinition,
  RendererEnv,
  FormRuntime,
} from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentForm } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

const submitCalls: Array<Record<string, any>> = [];

const env: RendererEnv = {
  fetcher: async function <T>(_api: ApiSchema, ctx: ApiRequestContext) {
    submitCalls.push(ctx.scope.readOwn());
    return {
      ok: true,
      status: 200,
      data: ctx.scope.readOwn() as T,
    };
  },
  notify: () => undefined,
};

const PlainScopeSchemaRenderer = createSchemaRenderer(allFormDefs);

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function PlainScopeArrayHost() {
  const [data, setData] = React.useState({ items: [{ id: 'item-0', value: 'alice' }] });

  return (
    <div>
      <button type="button" onClick={() => setData({ items: [{ id: 'item-0', value: 'carol' }] })}>
        Reset plain array
      </button>
      <PlainScopeSchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/bug-dual-state.test.tsx#plain-array"
        schema={{
          type: 'array-editor',
          name: 'items',
          label: 'Items',
        }}
        data={data}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    </div>
  );
}

function PlainScopeKeyValueHost() {
  const [data, setData] = React.useState({
    metadata: [{ id: 'pair-0', key: 'env', value: 'prod' }],
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => setData({ metadata: [{ id: 'pair-0', key: 'region', value: 'us-east' }] })}
      >
        Reset plain metadata
      </button>
      <PlainScopeSchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/bug-dual-state.test.tsx#plain-key-value"
        schema={{
          type: 'key-value',
          name: 'metadata',
          label: 'Metadata',
        }}
        data={data}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    </div>
  );
}

describe('bug: dual state in array-editor and key-value renderers', () => {
  beforeEach(() => {
    cleanup();
  });

  function createSchemaRendererWithFormProbe(onForm: (form: FormRuntime | undefined) => void) {
    function FormHandleProbe() {
      const form = useCurrentForm();
      React.useEffect(() => {
        onForm(form);
      }, [form]);
      return null;
    }

    const formHandleProbeRenderer: RendererDefinition = {
      type: 'form-handle-probe',
      component: FormHandleProbe,
    };

    return createSchemaRenderer([...allFormDefs, buttonRenderer, formHandleProbeRenderer]);
  }

  it('array-editor UI should reflect values after form.reset()', async () => {
    let capturedForm: FormRuntime | undefined;
    const SchemaRenderer = createSchemaRendererWithFormProbe((form) => {
      capturedForm = form;
    });

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/bug-dual-state.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            items: [{ value: 'alice' }],
          },
          body: [
            {
              type: 'array-editor',
              name: 'items',
              label: 'Items',
            },
            {
              type: 'form-handle-probe',
              name: '_probe',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByPlaceholderText('Item 1') as HTMLInputElement;
    expect(input.value).toBe('alice');

    fireEvent.change(input, { target: { value: 'bob' } });
    expect(input.value).toBe('bob');

    expect(capturedForm).toBeDefined();
    capturedForm!.reset({ items: [{ id: 'item-0', value: 'alice' }] });

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Item 1') as HTMLInputElement).value).toBe('alice');
    });
  });

  it('array-editor UI should reflect values after form.setValue()', async () => {
    let capturedForm: FormRuntime | undefined;
    const SchemaRenderer = createSchemaRendererWithFormProbe((form) => {
      capturedForm = form;
    });

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/bug-dual-state.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            items: [{ value: 'alice' }],
          },
          body: [
            {
              type: 'array-editor',
              name: 'items',
              label: 'Items',
            },
            {
              type: 'form-handle-probe',
              name: '_probe',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByPlaceholderText('Item 1') as HTMLInputElement;
    expect(input.value).toBe('alice');

    fireEvent.change(input, { target: { value: 'bob' } });
    expect(input.value).toBe('bob');

    expect(capturedForm).toBeDefined();
    capturedForm!.setValue('items', [{ id: 'item-0', value: 'carol' }]);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Item 1') as HTMLInputElement).value).toBe('carol');
    });
  });

  it('key-value UI should reflect values after form.reset()', async () => {
    let capturedForm: FormRuntime | undefined;
    const SchemaRenderer = createSchemaRendererWithFormProbe((form) => {
      capturedForm = form;
    });

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/bug-dual-state.test.tsx#3"
        schema={{
          type: 'form',
          data: {
            metadata: [{ key: 'env', value: 'prod' }],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
            },
            {
              type: 'form-handle-probe',
              name: '_probe',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const keyInput = screen.getByPlaceholderText('Key') as HTMLInputElement;
    const valueInput = screen.getByPlaceholderText('Value') as HTMLInputElement;
    expect(keyInput.value).toBe('env');
    expect(valueInput.value).toBe('prod');

    fireEvent.change(keyInput, { target: { value: 'tier' } });
    fireEvent.change(valueInput, { target: { value: 'gold' } });
    expect(keyInput.value).toBe('tier');
    expect(valueInput.value).toBe('gold');

    expect(capturedForm).toBeDefined();
    capturedForm!.reset({ metadata: [{ id: 'pair-0', key: 'env', value: 'prod' }] });

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Key') as HTMLInputElement).value).toBe('env');
    });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('Value') as HTMLInputElement).value).toBe('prod');
    });
  });

  it('key-value UI should reflect values after form.setValue()', async () => {
    let capturedForm: FormRuntime | undefined;
    const SchemaRenderer = createSchemaRendererWithFormProbe((form) => {
      capturedForm = form;
    });

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/bug-dual-state.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            metadata: [{ key: 'env', value: 'prod' }],
          },
          body: [
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
            },
            {
              type: 'form-handle-probe',
              name: '_probe',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const keyInput = screen.getByPlaceholderText('Key') as HTMLInputElement;
    const valueInput = screen.getByPlaceholderText('Value') as HTMLInputElement;
    expect(keyInput.value).toBe('env');
    expect(valueInput.value).toBe('prod');

    fireEvent.change(keyInput, { target: { value: 'tier' } });
    fireEvent.change(valueInput, { target: { value: 'gold' } });
    expect(keyInput.value).toBe('tier');
    expect(valueInput.value).toBe('gold');

    expect(capturedForm).toBeDefined();
    capturedForm!.setValue('metadata', [{ id: 'pair-0', key: 'region', value: 'us-east' }]);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Key') as HTMLInputElement).value).toBe('region');
    });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('Value') as HTMLInputElement).value).toBe('us-east');
    });
  });

  it('array-editor UI should reflect values after plain scope data updates', async () => {
    render(<PlainScopeArrayHost />);

    const input = screen.getByPlaceholderText('Item 1') as HTMLInputElement;
    expect(input.value).toBe('alice');

    fireEvent.change(input, { target: { value: 'bob' } });
    expect(input.value).toBe('bob');

    fireEvent.click(screen.getByText('Reset plain array'));

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Item 1') as HTMLInputElement).value).toBe('carol');
    });
  });

  it('key-value UI should reflect values after plain scope data updates', async () => {
    render(<PlainScopeKeyValueHost />);

    const keyInput = screen.getByPlaceholderText('Key') as HTMLInputElement;
    const valueInput = screen.getByPlaceholderText('Value') as HTMLInputElement;
    expect(keyInput.value).toBe('env');
    expect(valueInput.value).toBe('prod');

    fireEvent.change(keyInput, { target: { value: 'tier' } });
    fireEvent.change(valueInput, { target: { value: 'gold' } });
    expect(keyInput.value).toBe('tier');
    expect(valueInput.value).toBe('gold');

    fireEvent.click(screen.getByText('Reset plain metadata'));

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Key') as HTMLInputElement).value).toBe('region');
    });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('Value') as HTMLInputElement).value).toBe('us-east');
    });
  });
});

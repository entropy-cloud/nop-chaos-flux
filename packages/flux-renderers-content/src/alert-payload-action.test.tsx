import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererComponentProps, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer, useCurrentActionScope } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

// Captures the evaluated `value` arg of a `capture:record` namespaced action into the DOM.
// Namespaced action args are evaluated against the dispatch scope + evaluationBindings,
// so the captured value proves which payload fields reached the action template.
function CaptureProvider(props: RendererComponentProps) {
  const actionScope = useCurrentActionScope();
  const [captured, setCaptured] = React.useState('');
  React.useEffect(() => {
    if (!actionScope) return;
    return actionScope.registerNamespace('capture', {
      kind: 'host',
      invoke(_method, payload) {
        setCaptured(String((payload as { value?: unknown } | undefined)?.value ?? ''));
        return { ok: true, data: (payload as { value?: unknown } | undefined)?.value };
      },
    });
  }, [actionScope]);
  return (
    <span data-testid="capture-result" data-provider={String(props.props.label ?? 'capture')}>
      {captured}
    </span>
  );
}

const captureProviderRenderer: RendererDefinition = {
  type: 'capture-provider',
  component: CaptureProvider,
};

function createContentSchemaRenderer() {
  return createSchemaRenderer([
    pageRenderer,
    captureProviderRenderer,
    ...contentRendererDefinitions,
  ]);
}

const formulaCompiler = createFormulaCompiler();

describe('CD6: alert onClose payload fields ({level}) resolve in action args templates', () => {
  afterEach(() => {
    cleanup();
  });

  it('onClose args read ${level} from the event payload (evaluationBindings contract)', async () => {
    // Event-payload contract (eventContracts :307-316): payload { level } must be
    // reachable from action args — the steps/button-group/cards family passes
    // evaluationBindings: payload; alert must do the same.
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cd6-alert-payload-args"
        schema={{
          type: 'page',
          body: [
            { type: 'capture-provider', label: 'alert-close-payload' },
            {
              type: 'alert',
              testid: 'demo-alert',
              level: 'warning',
              title: 'Closable',
              closable: true,
              onClose: {
                action: 'capture:record',
                args: { value: '${level}' },
              },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('alert-close'));
    await waitFor(() => {
      expect(screen.getByTestId('capture-result').textContent).toBe('warning');
    });
  });
});

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RegisteredRendererDefinition, RendererComponentProps } from '@nop-chaos/flux-core';
import { createSchemaRenderer, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

afterEach(() => {
  cleanup();
});

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

const pageRenderer: RegisteredRendererDefinition = {
  type: 'page',
  component: (props: RendererComponentProps) => <section>{asReactNode(props.regions.body?.render())}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const echoRenderer = {
  type: 'publication-echo',
  component: function PublicationEcho(props: { props: { path?: string } }) {
    const path = String(props.props.path ?? '');
    const rendered = useScopeSelector((data: Record<string, unknown>) => {
      let current: unknown = data;
      for (const part of path.split('.')) {
        if (current == null || typeof current !== 'object') {
          return '__UNPUBLISHED__';
        }
        current = (current as Record<string, unknown>)[part];
      }
      return current === undefined ? '__UNPUBLISHED__' : JSON.stringify(current);
    }, Object.is);
    return <span data-testid="publication-echo">{rendered}</span>;
  },
  fields: [{ key: 'path', kind: 'prop' }],
} as never;

const scopeWriterRenderer = {
  type: 'scope-writer',
  component: function ScopeWriter(props: { props: { path?: string; value?: unknown } }) {
    const scope = useRenderScope();
    return (
      <button
        type="button"
        data-testid={`scope-writer-${String(props.props.path)}`}
        onClick={() => scope.update(String(props.props.path), props.props.value)}
      >
        write
      </button>
    );
  },
  fields: [
    { key: 'path', kind: 'prop' },
    { key: 'value', kind: 'prop' },
  ],
} as never;

function renderPage(body: unknown[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([
    pageRenderer,
    ...formRendererDefinitions,
    echoRenderer,
    scopeWriterRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/values-path-publication"
      schema={{ type: 'page', ...(data ? { data } : {}), body } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      data={data}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function flushDeferred() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function echo(): string {
  return screen.getByTestId('publication-echo').textContent ?? '';
}

describe('real FormRenderer valuesPath publication (plan 860)', () => {
  it('B3 probe: initial data reaches a sibling reader without user interaction', async () => {
    renderPage([
      { type: 'form', name: 'pub-form', valuesPath: 'ui.values', data: { cron: '*/5' }, body: [] },
      { type: 'publication-echo', path: 'ui.values' },
    ]);

    await waitFor(() => {
      expect(echo()).toBe(JSON.stringify({ cron: '*/5' }));
    });
  });

  it('A: recreating the owned runtime on the same valuesPath keeps the sibling reading the successor publication', async () => {
    renderPage(
      [
        { type: 'form', name: '${formName}', valuesPath: 'ui.values', data: { cron: '*/5' }, body: [] },
        { type: 'publication-echo', path: 'ui.values' },
        { type: 'scope-writer', path: 'formName', value: 'renamed' },
      ],
      { formName: 'original' },
    );

    await waitFor(() => {
      expect(echo()).toBe(JSON.stringify({ cron: '*/5' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('scope-writer-formName'));
    });
    // let the successor's deferred publish and the predecessor's deferred dispose both run
    await act(async () => {
      await flushDeferred();
    });

    expect(echo()).toBe(JSON.stringify({ cron: '*/5' }));
  });

  it('B: hiding the form (real teardown, no successor) withdraws its publication', async () => {
    renderPage(
      [
        { type: 'form', name: 'pub-form', visible: '${showForm}', valuesPath: 'ui.values', data: { cron: '*/5' }, body: [] },
        { type: 'publication-echo', path: 'ui.values' },
        { type: 'scope-writer', path: 'showForm', value: false },
      ],
      { showForm: true },
    );
    await waitFor(() => {
      expect(echo()).toBe(JSON.stringify({ cron: '*/5' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('scope-writer-showForm'));
      await flushDeferred();
    });

    expect(echo()).toBe('__UNPUBLISHED__');
  });

  it('C: a third-party write to the path survives the form being torn down', async () => {
    renderPage(
      [
        { type: 'form', name: 'pub-form', visible: '${showForm}', valuesPath: 'ui.values', data: { cron: '*/5' }, body: [] },
        { type: 'publication-echo', path: 'ui.values' },
        { type: 'scope-writer', path: 'ui.values', value: 'written-by-page' },
        { type: 'scope-writer', path: 'showForm', value: false },
      ],
      { showForm: true },
    );
    await waitFor(() => {
      expect(echo()).toBe(JSON.stringify({ cron: '*/5' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('scope-writer-ui.values'));
    });
    expect(echo()).toBe(JSON.stringify('written-by-page'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('scope-writer-showForm'));
      await flushDeferred();
    });

    expect(echo()).toBe(JSON.stringify('written-by-page'));
  });
});

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createDataSchemaRenderer,
  dispatchProbeRenderer,
  env,
  formulaCompiler,
  nodeInstanceProbeRenderer,
  registerProbeNamespace,
  rowRecordNameProbeRenderer,
  rowScopeIdProbeRenderer,
} from '../test-support.js';

describe('data table row scope identity', () => {
  it('passes row instancePath through helpers.dispatch action context', async () => {
    cleanup();
    const observedLocators: unknown[] = [];
    const SchemaRenderer = createDataSchemaRenderer([dispatchProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Dispatch', cell: { type: 'dispatch-probe' } }],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={registerProbeNamespace(observedLocators)}
      />,
    );
    fireEvent.click(await screen.findByTestId('dispatch-probe'));
    await waitFor(() => {
      expect(observedLocators).toEqual([
        expect.objectContaining({
          instancePath: [
            { repeatedTemplateId: expect.stringMatching(/^table-row:/), instanceKey: '1' },
          ],
        }),
      ]);
    });
  });

  it('uses schema rowKey as stable repeated identity instead of source index', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([nodeInstanceProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: '__rowKey',
              columns: [{ label: 'Probe', cell: { type: 'node-instance-probe' } }],
              source: [{ id: 99, __rowKey: 'client-a', name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect((await screen.findByTestId('node-instance-probe')).textContent).toContain('client-a');
  });

  it('reuses one stable row scope per materialized row key', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([rowScopeIdProbeRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://data/table-row-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              columns: [{ label: 'Scope', cell: { type: 'row-scope-id-probe' } }],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const initialScopeId = (await screen.findByTestId('row-scope-id-probe')).textContent;
    rerender(
      <SchemaRenderer
        schemaUrl="test://data/table-row-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              columns: [{ label: 'Scope', cell: { type: 'row-scope-id-probe' } }],
              source: [{ id: 1, name: 'Alice updated' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect((await screen.findByTestId('row-scope-id-probe')).textContent).toBe(initialScopeId);
  });

  it('does not reuse row scopes across keyed StrictMode schema remounts', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([rowScopeIdProbeRenderer, rowRecordNameProbeRenderer]);
    const buildSchema = (name: string) => ({
      type: 'page' as const,
      body: [
        {
          type: 'table' as const,
          rowKey: 'id',
          columns: [
            { label: 'Scope', cell: { type: 'row-scope-id-probe' } },
            { label: 'Name', cell: { type: 'row-record-name-probe' } },
          ],
          source: [{ id: 1, name }],
        },
      ],
    });
    const { rerender } = render(
      <React.StrictMode>
        <SchemaRenderer
          key="first"
          schemaUrl="test://data/table-row-scope-remount"
          schema={buildSchema('Alice')}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </React.StrictMode>,
    );

    const initialScopeId = (await screen.findByTestId('row-scope-id-probe')).textContent;
    expect((await screen.findByTestId('row-record-name-probe')).textContent).toBe('Alice');

    rerender(
      <React.StrictMode>
        <SchemaRenderer
          key="second"
          schemaUrl="test://data/table-row-scope-remount"
          schema={buildSchema('Bob')}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('row-record-name-probe').textContent).toBe('Bob');
    });
    expect(screen.getByTestId('row-scope-id-probe').textContent).not.toBe(initialScopeId);
  });

  it('reuses the same row scope while row-local consumers observe updated record content', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([rowScopeIdProbeRenderer, rowRecordNameProbeRenderer]);
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://data/table-row-scope-record"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              columns: [
                { label: 'Scope', cell: { type: 'row-scope-id-probe' } },
                { label: 'Name', cell: { type: 'row-record-name-probe' } },
              ],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const initialScopeId = (await screen.findByTestId('row-scope-id-probe')).textContent;
    expect((await screen.findByTestId('row-record-name-probe')).textContent).toBe('Alice');

    rerender(
      <SchemaRenderer
        schemaUrl="test://data/table-row-scope-record"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowKey: 'id',
              columns: [
                { label: 'Scope', cell: { type: 'row-scope-id-probe' } },
                { label: 'Name', cell: { type: 'row-record-name-probe' } },
              ],
              source: [{ id: 1, name: 'Alice updated' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect((await screen.findByTestId('row-scope-id-probe')).textContent).toBe(initialScopeId);
    expect((await screen.findByTestId('row-record-name-probe')).textContent).toBe('Alice updated');
  });
});

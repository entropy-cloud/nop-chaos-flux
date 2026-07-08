import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env as baseEnv, formulaCompiler } from '../test-support.js';

const RECORDS = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'user', status: 'active' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'admin', status: 'active' },
];

function buildSchema() {
  return {
    type: 'page',
    body: [
      {
        type: 'crud',
        id: 'confirm-gate-crud',
        source: RECORDS,
        rowKey: 'id',
        columns: [
          { name: 'name', label: 'Name' },
          {
            type: 'operation',
            label: 'Actions',
            buttons: [
              {
                type: 'button',
                label: 'Delete',
                testid: 'btn-delete',
                onClick: {
                  action: 'confirm',
                  args: { message: 'sure?' },
                  then: {
                    action: 'ajax',
                    when: '${result.data.confirmed}',
                    args: {
                      url: '/api/users',
                      method: 'delete',
                      data: { id: '${$slot.record.id}' },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('CRUD confirm-gated delete (schema contract for playground crud-demo)', () => {
  afterEach(() => {
    cleanup();
  });

  it('runs the delete ajax when confirm resolves true', async () => {
    const fetcher = vi.fn(async <T,>(_api: unknown): Promise<{ ok: boolean; status: number; data: T }> => ({
      ok: true,
      status: 200,
      data: null as T,
    }));
    const testEnv: RendererEnv = {
      ...baseEnv,
      fetcher: fetcher as unknown as RendererEnv['fetcher'],
      confirm: vi.fn(async () => true),
    };
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://crud-confirm-gate/ok"
        schema={buildSchema() as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={testEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());

    fireEvent.click(screen.getAllByText('Delete')[0]);

    await waitFor(() => {
      const deleteCalls = fetcher.mock.calls.filter(
        (call) => (call[0] as { method?: string }).method === 'delete',
      );
      expect(deleteCalls).toHaveLength(1);
      expect((deleteCalls[0][0] as { data?: unknown }).data).toEqual({ id: '1' });
    });
  });

  it('skips the delete ajax when confirm resolves false', async () => {
    const fetcher = vi.fn(async <T,>(_api: unknown): Promise<{ ok: boolean; status: number; data: T }> => ({
      ok: true,
      status: 200,
      data: null as T,
    }));
    const testEnv: RendererEnv = {
      ...baseEnv,
      fetcher: fetcher as unknown as RendererEnv['fetcher'],
      confirm: vi.fn(async () => false),
    };
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://crud-confirm-gate/cancel"
        schema={buildSchema() as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={testEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());

    fireEvent.click(screen.getAllByText('Delete')[0]);

    await waitFor(() => expect(testEnv.confirm).toHaveBeenCalledTimes(1));
    expect(fetcher.mock.calls.filter((call) => (call[0] as { method?: string }).method === 'delete')).toHaveLength(0);
  });
});

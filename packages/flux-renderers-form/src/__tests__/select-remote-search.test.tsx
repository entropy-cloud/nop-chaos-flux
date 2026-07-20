import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { ApiFetcher } from '@nop-chaos/flux-core';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

afterEach(() => {
  cleanup();
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-remote-search"
      schema={{
        type: 'form',
        ...(data ? { data } : {}),
        body,
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function typeAndSearch(label: string, query: string) {
  const input = screen.getByRole('combobox', { name: label }) as HTMLInputElement;
  fireEvent.mouseDown(input);
  fireEvent.click(input);
  fireEvent.input(input, { target: { value: query } });
}

describe('select remote search (S4)', () => {
  it('falls back to local filter when searchSource is not set', async () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    ]);

    typeAndSearch('Role', 'Admin');

    await waitFor(() => {
      const options = screen.queryAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]?.textContent).toBe('Admin');
    });
  });

  it('renders without error when searchSource is present but not active', () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        searchSource: { action: 'ajax', args: { url: '/api/search' } },
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    ]);

    const input = screen.queryByRole('combobox', { name: 'Role' });
    expect(input).toBeTruthy();
  });

  it('dispatches search action on user input', async () => {
    const mockFetcher = vi.fn(async () => ({
      ok: true as const,
      status: 200 as const,
      data: [] as never[],
    }));
    const fetcher = mockFetcher as unknown as ApiFetcher;

    const testEnv = { ...env, fetcher };
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://form/select-remote-search-dispatch"
        schema={{
          type: 'form',
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              searchable: true,
              searchSource: { action: 'ajax', args: { url: '/api/search' } },
              options: [],
            },
          ],
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    typeAndSearch('Role', 'test');

    await vi.waitFor(() => {
      expect(mockFetcher).toHaveBeenCalled();
    });
  });

  it('replaces options when searchMergeMode is replace', async () => {
    const mockFetcher = vi.fn(async () => ({
      ok: true as const,
      status: 200 as const,
      data: [{ label: 'RemoteOnly', value: 'remote' }],
    }));
    const fetcher = mockFetcher as unknown as ApiFetcher;

    const testEnv = { ...env, fetcher };
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://form/select-remote-search-replace"
        schema={{
          type: 'form',
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              searchable: true,
              searchSource: { action: 'ajax', args: { url: '/api/search' } },
              searchMergeMode: 'replace',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Viewer', value: 'viewer' },
              ],
            },
          ],
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    typeAndSearch('Role', 'search');

    await waitFor(() => {
      const options = screen.queryAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      const labels = options.map((o) => o.textContent);
      expect(labels).toContain('RemoteOnly');
    });
  });

  it('returns to local options when search query is cleared', async () => {
    const mockFetcher = vi.fn(async () => ({
      ok: true as const,
      status: 200 as const,
      data: [{ label: 'RemoteOnly', value: 'remote' }],
    }));
    const fetcher = mockFetcher as unknown as ApiFetcher;

    const testEnv = { ...env, fetcher };
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://form/select-remote-search-clear"
        schema={{
          type: 'form',
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              searchable: true,
              searchSource: { action: 'ajax', args: { url: '/api/search' } },
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Viewer', value: 'viewer' },
              ],
            },
          ],
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    typeAndSearch('Role', 'search');

    await waitFor(() => {
      const options = screen.queryAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    const input = screen.getByRole('combobox', { name: 'Role' }) as HTMLInputElement;
    fireEvent.input(input, { target: { value: '' } });

    await waitFor(() => {
      const options = screen.queryAllByRole('option');
      const labels = options.map((o) => o.textContent);
      expect(labels).toContain('Admin');
      expect(labels).toContain('Viewer');
    });
  });
});

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

function renderRemoteEchoForm(mode: 'append' | 'replace') {
  const mockFetcher = vi.fn(async () => ({
    ok: true as const,
    status: 200 as const,
    data: [{ label: 'RemoteOnly', value: 'remote-1' }],
  }));
  const fetcher = mockFetcher as unknown as ApiFetcher;
  const testEnv = { ...env, fetcher };
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  const utils = render(
    <SchemaRenderer
      schemaUrl={`test://form/select-remote-echo-${mode}`}
      schema={{
        type: 'form',
        body: [
          {
            type: 'select',
            name: 'roles',
            label: 'Roles',
            searchable: true,
            multiple: true,
            searchSource: { action: 'ajax', args: { url: '/api/search' } },
            searchMergeMode: mode,
            options: [{ label: 'Admin', value: 'admin' }],
          },
        ],
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={testEnv}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
  return { ...utils, mockFetcher };
}

function chipTexts() {
  return Array.from(document.querySelectorAll('[data-slot="combobox-chip"]')).map(
    (chip) => chip.textContent ?? '',
  );
}

async function selectRemoteOption() {
  typeAndSearch('Roles', 'remote');
  // The remote search debounce (300ms) + dispatch + fetch + startTransition
  // render chain can exceed the default waitFor timeout under cold
  // transforms; use a generous timeout (the option appearance itself is not
  // the discriminator of this test — the chip echo is). The existing remote
  // tests query options by textContent (queryAllByRole), which is the stable
  // pattern in this file.
  await waitFor(
    () => {
      const options = screen.queryAllByRole('option');
      expect(options.some((option) => option.textContent === 'RemoteOnly')).toBe(true);
    },
    { timeout: 5000 },
  );
  const option = screen
    .getAllByRole('option')
    .find((candidate) => candidate.textContent === 'RemoteOnly');
  expect(option).toBeTruthy();
  fireEvent.click(option as Element);
  await waitFor(() => {
    expect(chipTexts().some((text) => text.includes('RemoteOnly'))).toBe(true);
  });
  expect(chipTexts().some((text) => text.includes('remote-1'))).toBe(false);
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

  it('aborts in-flight remote search when component unmounts', async () => {
    const abortSpy = vi.fn();
    const originalAbort = AbortController.prototype.abort;
    AbortController.prototype.abort = abortSpy;

    const mockFetcher = vi.fn(async () => ({
      ok: true as const,
      status: 200 as const,
      data: [{ label: 'Remote', value: 'remote' }],
    }));
    const fetcher = mockFetcher as unknown as ApiFetcher;

    const testEnv = { ...env, fetcher };
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://select/abort-on-unmount"
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

    unmount();

    expect(abortSpy).toHaveBeenCalled();
    AbortController.prototype.abort = originalAbort;
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

  it('echoes the selected remote option label in the chip and keeps it after the query clears (append)', async () => {
    renderRemoteEchoForm('append');
    await selectRemoteOption();

    // Clearing the search query must not flip the chip back to the raw id
    // (1-12 live defect: resolveChoiceComboboxValue fell back to String(value)).
    const input = screen.getByRole('combobox', { name: 'Roles' }) as HTMLInputElement;
    fireEvent.input(input, { target: { value: '' } });

    await waitFor(() => {
      expect(chipTexts().some((text) => text.includes('RemoteOnly'))).toBe(true);
    });
    expect(chipTexts().some((text) => text.includes('remote-1'))).toBe(false);
  });

  it('echoes the selected remote option label in the chip and keeps it after the query clears (replace)', async () => {
    renderRemoteEchoForm('replace');
    await selectRemoteOption();

    const input = screen.getByRole('combobox', { name: 'Roles' }) as HTMLInputElement;
    fireEvent.input(input, { target: { value: '' } });

    await waitFor(() => {
      expect(chipTexts().some((text) => text.includes('RemoteOnly'))).toBe(true);
    });
    expect(chipTexts().some((text) => text.includes('remote-1'))).toBe(false);
  });
});

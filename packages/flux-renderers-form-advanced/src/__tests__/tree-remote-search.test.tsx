import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allFormDefs } from './form-tree-checkbox-fields.shared.js';
import { env as defaultEnv } from '../test-support.js';

// Importing test-support triggers i18n init (en-US locale) — required so
// `t('flux.common.search')` resolves to 'Search' (not the Chinese fallback).
void defaultEnv;

function makeRemoteSearchEnv(respond: (searchQuery: string) => unknown[]): RendererEnv {
  return {
    fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
      const scopeData = ctx.scope.readVisible() as { searchQuery?: string };
      const query = String(scopeData?.searchQuery ?? '');
      return { ok: true, status: 200, data: respond(query) as T };
    },
    notify: () => undefined,
  };
}

function renderTree(
  schemaBody: Record<string, unknown>[],
  env: RendererEnv,
  schemaUrlSuffix = 'a',
) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl={`test://flux-renderers-form-advanced/__tests__/tree-remote-search.test.tsx#${schemaUrlSuffix}`}
      schema={
        {
          type: 'form',
          body: schemaBody,
        } as any
      }
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

const allFruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

describe('tree controls - remote search (E2d searchSource)', () => {
  it('drives searchSource refresh (debounced) when searchable + searchSource declared and replaces options', async () => {
    const env = makeRemoteSearchEnv((query) =>
      allFruits.filter((fruit) => fruit.label.toLowerCase().includes(query.toLowerCase())),
    );

    renderTree(
      [
        {
          type: 'input-tree',
          name: 'fruits',
          label: 'Fruits',
          searchable: true,
          searchSource: {
            action: 'ajax',
            args: { url: '/api/fruits', method: 'get' },
          },
          options: [{ label: 'Static', value: 'static' }],
        },
      ],
      env,
      'remote-search',
    );

    expect(screen.getByRole('treeitem', { name: 'Static' })).toBeTruthy();

    const search = screen.getByPlaceholderText('Search Fruits');
    fireEvent.change(search, { target: { value: 'ap' } });

    await waitFor(
      () => {
        expect(screen.getByRole('treeitem', { name: 'Apple' })).toBeTruthy();
        expect(screen.getByRole('treeitem', { name: 'Apricot' })).toBeTruthy();
        expect(screen.queryByRole('treeitem', { name: 'Banana' })).toBeNull();
        expect(screen.queryByRole('treeitem', { name: 'Static' })).toBeNull();
      },
      { timeout: 3000 },
    );
  });

  it('shows zero-results empty state when remote search returns an empty array', async () => {
    const env = makeRemoteSearchEnv(() => []);

    renderTree(
      [
        {
          type: 'input-tree',
          name: 'fruits',
          label: 'Fruits',
          searchable: true,
          searchSource: {
            action: 'ajax',
            args: { url: '/api/fruits', method: 'get' },
          },
          options: [{ label: 'Static', value: 'static' }],
        },
      ],
      env,
      'remote-empty',
    );

    const search = screen.getByPlaceholderText('Search Fruits');
    fireEvent.change(search, { target: { value: 'zzz' } });

    await waitFor(
      () => {
        expect(screen.getByText('No results found')).toBeTruthy();
        expect(document.querySelector('[data-slot="tree-option-empty"]')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it('falls back to local substring filtering when searchable but no searchSource declared', async () => {
    renderTree(
      [
        {
          type: 'input-tree',
          name: 'fruits',
          label: 'Fruits',
          searchable: true,
          options: allFruits,
        },
      ],
      makeRemoteSearchEnv(() => allFruits),
      'local-fallback',
    );

    const search = screen.getByPlaceholderText('Search Fruits');
    fireEvent.change(search, { target: { value: 'ap' } });

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Apple' })).toBeTruthy();
      expect(screen.getByRole('treeitem', { name: 'Apricot' })).toBeTruthy();
      expect(screen.queryByRole('treeitem', { name: 'Banana' })).toBeNull();
      expect(screen.queryByRole('treeitem', { name: 'Cherry' })).toBeNull();
    });
  });

  it('restores static options when remote query is cleared', async () => {
    const env = makeRemoteSearchEnv((query) =>
      allFruits.filter((fruit) => fruit.label.toLowerCase().includes(query.toLowerCase())),
    );

    renderTree(
      [
        {
          type: 'input-tree',
          name: 'fruits',
          label: 'Fruits',
          searchable: true,
          searchSource: {
            action: 'ajax',
            args: { url: '/api/fruits', method: 'get' },
          },
          options: [{ label: 'Static', value: 'static' }],
        },
      ],
      env,
      'remote-clear',
    );

    const search = screen.getByPlaceholderText('Search Fruits');
    fireEvent.change(search, { target: { value: 'ap' } });

    await waitFor(
      () => {
        expect(screen.getByRole('treeitem', { name: 'Apple' })).toBeTruthy();
      },
      { timeout: 3000 },
    );

    fireEvent.change(search, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Static' })).toBeTruthy();
      expect(screen.queryByRole('treeitem', { name: 'Apple' })).toBeNull();
    });
  });

  it('shows inline error when remote search source fails (tree-select popover)', async () => {
    const failingEnv: RendererEnv = {
      fetcher: async () => ({ ok: false, status: 500, data: null as never }),
      notify: () => undefined,
    };

    renderTree(
      [
        {
          type: 'tree-select',
          name: 'fruits',
          label: 'Fruits',
          searchable: true,
          searchSource: {
            action: 'ajax',
            args: { url: '/api/fruits', method: 'get' },
          },
          options: [{ label: 'Static', value: 'static' }],
        },
      ],
      failingEnv,
      'remote-error',
    );

    fireEvent.click(screen.getByRole('button', { name: /Fruits/ }));
    const search = await screen.findByPlaceholderText('Search Fruits');
    fireEvent.change(search, { target: { value: 'zzz' } });

    await waitFor(
      () => {
        const error = document.querySelector('[data-slot="tree-select-source-error"]');
        expect(error).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});

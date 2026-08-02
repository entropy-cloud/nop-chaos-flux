import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

it('searchSource with params template dispatches (replicates lab schema)', async () => {
  const calls: Array<{ url?: string; args?: unknown }> = [];
  const mockFetcher = vi.fn(async (api: { url?: string; args?: unknown }) => {
    calls.push({ url: api.url, args: api.args });
    return { ok: true, status: 200, data: [{ label: 'Apple', value: 'apple' }] };
  });
  const testEnv = { ...env, fetcher: mockFetcher as never };

  render(
    <SchemaRenderer
      schemaUrl="test://form/select-remote-search-lab"
      schema={{
        type: 'form',
        body: [
          {
            type: 'select',
            name: 'fruit',
            label: 'Fruit',
            searchable: true,
            searchSource: {
              action: 'ajax',
              args: { url: '/api/choice-search', params: { q: '${searchQuery}' } },
            },
            options: [],
          },
        ],
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={testEnv}
      formulaCompiler={formulaCompiler}
    />,
  );

  const input = screen.getByRole('combobox', { name: 'Fruit' }) as HTMLInputElement;
  fireEvent.mouseDown(input);
  fireEvent.click(input);
  fireEvent.input(input, { target: { value: 'ap' } });

  await vi.waitFor(() => {
    expect(mockFetcher).toHaveBeenCalled();
  });
  // The ajax executor evaluates the ${searchQuery} template and canonicalizes
  // the params into the request URL (live host fetchers must read q from the
  // query string, NOT from api.args.params).
  expect(calls[0]).toMatchObject({ url: '/api/choice-search?q=ap' });
});

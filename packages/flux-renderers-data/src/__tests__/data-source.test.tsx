import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('dataRendererDefinitions data-source behavior', () => {
  it('allows formula data-sources to publish by name', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/data-source" schema={{ type: 'page', body: [{ type: 'data-source', name: 'greeting', formula: '${"hello"}' }, { type: 'text', text: '${greeting}' }] }} env={env} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('hello')).toBeTruthy());
  });

  it('evaluates formula sources into explicit name bindings', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/data-source" schema={{ type: 'page', body: [{ type: 'data-source', name: 'total', formula: '${4 * 6}' }, { type: 'text', text: 'Total: ${total}' }] }} env={env} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Total: 24')).toBeTruthy());
  });

  it('fetches data and injects into scope', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: { name: 'Alice' } })) as RendererEnv['fetcher'];
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/data-source" schema={{ type: 'page', body: [{ type: 'data-source', api: { url: '/api/user/1' }, name: 'user' }, { type: 'text', text: 'Hello, ${user?.name}' }] }} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Hello, Alice')).toBeTruthy());
    expect(fetcher).toHaveBeenCalled();
  });

  it('uses initialData before fetch completes', async () => {
    cleanup();
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: { name: 'Bob' } })) as RendererEnv['fetcher'];
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/data-source" schema={{ type: 'page', body: [{ type: 'data-source', api: { url: '/api/user/1' }, name: 'user', initialData: { name: 'Initial' } }, { type: 'text', text: 'Hello, ${user?.name}' }] }} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Hello, Bob')).toBeTruthy());
  });

  it('shows error message on fetch failure', async () => {
    cleanup();
    const fetcher = vi.fn(async () => {
      throw new Error('Network error');
    }) as RendererEnv['fetcher'];
    const notify = vi.fn();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/data-source" schema={{ type: 'page', body: [{ type: 'data-source', api: { url: '/api/error' }, name: 'data' }] }} env={{ ...env, fetcher, notify }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(notify).toHaveBeenCalledWith('error', expect.any(String)));
  });

  it('applies named mergeToScope publication through the renderer lifecycle', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/data-source"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              name: 'companyLookup',
              formula: '${{ companyName: "Alice", companyTaxCode: "TX-1" }}',
              mergeToScope: true
            },
            {
              type: 'text',
              text: '${companyName}/${companyTaxCode}/${companyLookup != null ? "named" : "missing"}'
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    await waitFor(() => expect(screen.getByText('Alice/TX-1/named')).toBeTruthy());
  });

  it('suppresses error notification when silent is true', async () => {
    cleanup();
    const fetcher = vi.fn(async () => {
      throw new Error('Server error');
    }) as RendererEnv['fetcher'];
    const notify = vi.fn();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/data-source" schema={{ type: 'page', body: [{ type: 'data-source', api: { url: '/api/error' }, name: 'data', silent: true }] }} env={{ ...env, fetcher, notify }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(notify).not.toHaveBeenCalled();
  });

  it('keeps cache isolated between independent renderer roots', async () => {
    cleanup();
    const fetcherSpy = vi.fn();
    const fetcher: RendererEnv['fetcher'] = async <T,>() => {
      fetcherSpy();
      return { ok: true, status: 200, data: { value: 'cached' } as T };
    };
    const SchemaRenderer = createDataSchemaRenderer();
    const schema = { type: 'page', body: [{ type: 'data-source', api: { url: '/api/data', cacheTTL: 60000, cacheKey: 'test-cache' }, name: 'data' }, { type: 'text', text: 'Value: ${data?.value}' }] } as const;
    const { unmount } = render(<SchemaRenderer schemaUrl="test://data/data-source-a" schema={schema} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Value: cached')).toBeTruthy());
    const firstRenderCallCount = fetcherSpy.mock.calls.length;
    unmount();
    cleanup();
    render(<SchemaRenderer schemaUrl="test://data/data-source-b" schema={schema} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Value: cached')).toBeTruthy());
    expect(fetcherSpy.mock.calls.length).toBeGreaterThan(firstRenderCallCount);
  });
});

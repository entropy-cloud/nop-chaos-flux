import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { basicRendererDefinitions } from '../basic-renderer-definitions.js';

type MockFetcher = RendererEnv['fetcher'] & ReturnType<typeof vi.fn>;

function createMockFetcher(
  implementation: (...args: Parameters<RendererEnv['fetcher']>) => Promise<unknown>,
): MockFetcher {
  return vi.fn(implementation) as unknown as MockFetcher;
}

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

describe('basicRendererDefinitions dynamic-renderer', () => {
  it('publishes loadAction as a raw prop (evaluated by the renderer, not a renderer event)', () => {
    const dynamicRenderer = basicRendererDefinitions.find((definition) => definition.type === 'dynamic-renderer');
    expect(dynamicRenderer?.fields?.find((field) => field.key === 'loadAction')?.kind).toBe('prop');
  });

  it('renders body content while loading', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              body: { type: 'text', text: 'Loading...' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(document.querySelector('[data-slot="dynamic-renderer-loading"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="dynamic-renderer-loading"]')).toBeTruthy();
    cleanup();
  });

  it('replaces body with loaded schema on success', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'Dynamic content loaded' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              body: { type: 'text', text: 'Loading...' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Dynamic content loaded')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('shows request error when loadAction fails', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: false,
      status: 500,
      data: null,
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              body: { type: 'text', text: 'Loading...' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Error: Request failed with status 500')).toBeTruthy());
    cleanup();
  });

  it('shows an error when the action returns an invalid schema payload', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { text: 'Missing type field' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              body: { type: 'text', text: 'Loading...' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText('Error: Invalid schema received from action')).toBeTruthy(),
    );
    cleanup();
  });

  it('clears stale loaded schema while a new load is in flight', async () => {
    const pendingResolves: Array<
      (value: { ok: boolean; status: number; data: { type: string; text: string } }) => void
    > = [];
    const fetcher = vi.fn(
      async () =>
        new Promise((resolve) => {
          pendingResolves.push(resolve);
        }),
    ) as RendererEnv['fetcher'];
    const SchemaRenderer = createBasicSchemaRenderer();
    const schema = (url: string) => ({
      type: 'page',
      body: [
        {
          type: 'dynamic-renderer',
          loadAction: { action: 'ajax', args: { url } },
          body: { type: 'text', text: 'Loading...' },
        },
      ],
    });

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={schema('/api/first')}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    pendingResolves.shift()?.({ ok: true, status: 200, data: { type: 'text', text: 'First schema' } });
    await waitFor(() => expect(screen.getByText('First schema')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={schema('/api/second')}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(document.querySelector('[data-slot="dynamic-renderer-loading"]')).toBeTruthy());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('First schema')).toBeNull();

    pendingResolves.shift()?.({ ok: true, status: 200, data: { type: 'text', text: 'Second schema' } });
    await waitFor(() => expect(screen.getByText('Second schema')).toBeTruthy());
    cleanup();
  });

  it('reloads when the resolved loadAction changes through scope data', async () => {
    const fetcher = createMockFetcher(async (api) => {
      const request = api as { url?: string };
      if (request.url === '/api/text') {
        return {
          ok: true,
          status: 200,
          data: { type: 'text', text: 'Loaded text schema' },
        };
      }

      return {
        ok: true,
        status: 200,
        data: { type: 'badge', text: 'Loaded badge schema', level: 'success' },
      };
    });
    const SchemaRenderer = createBasicSchemaRenderer();

    const schema = {
      type: 'page',
      body: [
        { type: 'text', text: 'Current kind: ${schemaType}' },
        {
          type: 'dynamic-renderer',
          loadAction: {
            action: 'ajax',
            args: {
              url: '${schemaType === "text" ? "/api/text" : "/api/badge"}',
            },
          },
          body: { type: 'text', text: 'Loading...' },
        },
      ],
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={schema}
        data={{ schemaType: 'badge' }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Current kind: badge')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Loaded badge schema')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={schema}
        data={{ schemaType: 'text' }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Current kind: text')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Loaded text schema')).toBeTruthy());
    expect(fetcher.mock.calls.map(([api]) => {
      const request = api as { url?: string };
      return request.url;
    })).toEqual(
      expect.arrayContaining(['/api/badge', '/api/text']),
    );
    cleanup();
  });
});

describe('basicRendererDefinitions dynamic-renderer autoLoad + component:refresh (E3)', () => {
  it('publishes autoLoad as a boolean prop field and refresh as a capability contract', () => {
    const dynamicRenderer = basicRendererDefinitions.find((definition) => definition.type === 'dynamic-renderer');
    expect(dynamicRenderer?.fields?.find((field) => field.key === 'autoLoad')?.valueType).toBe('boolean');
    expect(dynamicRenderer?.componentCapabilityContracts?.map((contract) => contract.handle)).toEqual(['refresh']);
  });

  it('autoload-false-no-fire: autoLoad:false skips fetcher on mount and shows body region without spinner', () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'Should not load' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              id: 'dyn',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              autoLoad: false,
              body: { type: 'text', text: 'Idle body' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="dynamic-renderer-loading"]')).toBeNull();
    expect(document.querySelector('[data-loading]')).toBeNull();
    expect(screen.getByText('Idle body')).toBeTruthy();
    cleanup();
  });

  it('refresh-triggers-load: component:refresh triggers fetcher and schema replaces body', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'Refreshed schema' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              id: 'dyn',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              autoLoad: false,
              body: { type: 'text', text: 'Idle body' },
            },
            {
              type: 'button',
              label: 'Refresh',
              onClick: { action: 'component:refresh', componentId: 'dyn' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(fetcher).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(screen.getByText('Refreshed schema')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('refresh-no-loadaction: component:refresh without loadAction returns ok:false and does not change state', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'Should not load' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              id: 'dyn',
              autoLoad: false,
              body: { type: 'text', text: 'Idle body' },
            },
            {
              type: 'button',
              label: 'Set Flag',
              onClick: {
                action: 'component:refresh',
                componentId: 'dyn',
                onError: {
                  action: 'setValue',
                  args: { path: 'refreshError', value: 'caught' },
                },
              },
            },
            { type: 'text', text: 'Error: ${refreshError}' },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set Flag' }));

    await waitFor(() => expect(screen.getByText('Error: caught')).toBeTruthy());
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByText('Idle body')).toBeTruthy();
    cleanup();
  });

  it('refresh-while-loading: second refresh aborts the in-flight request and starts a new one', async () => {
    const pendingResolves: Array<(value: { ok: boolean; status: number; data: { type: string; text: string } }) => void> =
      [];
    const fetcher = vi.fn(
      async () =>
        new Promise((resolve) => {
          pendingResolves.push(resolve);
        }),
    ) as RendererEnv['fetcher'];

    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              id: 'dyn',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              autoLoad: false,
              body: { type: 'text', text: 'Idle body' },
            },
            {
              type: 'button',
              label: 'Refresh',
              onClick: { action: 'component:refresh', componentId: 'dyn' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    pendingResolves.shift()?.({ ok: true, status: 200, data: { type: 'text', text: 'First schema' } });
    pendingResolves.shift()?.({ ok: true, status: 200, data: { type: 'text', text: 'Second schema' } });

    await waitFor(() => expect(screen.getByText('Second schema')).toBeTruthy());
    expect(screen.queryByText('First schema')).toBeNull();
    cleanup();
  });

  it('refresh-eval-error: refresh returns ok:false when dispatch fails (error propagation)', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: false,
      status: 500,
      data: null,
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              id: 'dyn',
              loadAction: { action: 'ajax', args: { url: '/api/fail' } },
              autoLoad: false,
              body: { type: 'text', text: 'Idle body' },
            },
            {
              type: 'button',
              label: 'Set Flag',
              onClick: {
                action: 'component:refresh',
                componentId: 'dyn',
                onError: {
                  action: 'setValue',
                  args: { path: 'refreshFailed', value: 'caught' },
                },
              },
            },
            { type: 'text', text: 'Failed: ${refreshFailed}' },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set Flag' }));

    await waitFor(() => expect(screen.getByText('Failed: caught')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('default autoLoad:true keeps current behavior (regression guard)', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'Auto-loaded' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              loadAction: { action: 'ajax', args: { url: '/api/schema' } },
              body: { type: 'text', text: 'Loading...' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Auto-loaded')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
  });
});

describe('basicRendererDefinitions dynamic-renderer schema-fetch dedup + cache (A11)', () => {
  it('two co-mounted dynamic-renderers with the same cacheable loadAction share one in-flight fetch', async () => {
    let release: ((value: { ok: boolean; status: number; data: unknown }) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    ) as RendererEnv['fetcher'];

    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dynamic-renderer',
              id: 'dyn-a',
              loadAction: {
                action: 'ajax',
                args: { url: '/api/shared-schema' },
                control: { cacheTTL: 5000 },
              },
              body: { type: 'text', text: 'Loading A' },
            },
            {
              type: 'dynamic-renderer',
              id: 'dyn-b',
              loadAction: {
                action: 'ajax',
                args: { url: '/api/shared-schema' },
                control: { cacheTTL: 5000 },
              },
              body: { type: 'text', text: 'Loading B' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    release?.({ ok: true, status: 200, data: { type: 'text', text: 'Shared schema' } });

    await waitFor(() => expect(screen.getAllByText('Shared schema')).toHaveLength(2));
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
  });
});

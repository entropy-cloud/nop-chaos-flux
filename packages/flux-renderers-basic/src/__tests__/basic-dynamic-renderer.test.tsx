import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
  it('publishes loadAction as an event field', () => {
    const dynamicRenderer = basicRendererDefinitions.find((definition) => definition.type === 'dynamic-renderer');
    expect(dynamicRenderer?.fields?.find((field) => field.key === 'loadAction')?.kind).toBe('event');
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

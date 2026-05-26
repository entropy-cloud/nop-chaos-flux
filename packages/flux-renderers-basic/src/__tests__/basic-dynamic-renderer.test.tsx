import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { basicRendererDefinitions } from '../basic-renderer-definitions.js';

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
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'Dynamic content loaded' },
    })) as RendererEnv['fetcher'];
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
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 500,
      data: null,
    })) as RendererEnv['fetcher'];
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
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { text: 'Missing type field' },
    })) as RendererEnv['fetcher'];
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
});

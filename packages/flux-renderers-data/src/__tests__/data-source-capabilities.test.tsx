import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

afterEach(() => {
  cleanup();
});

describe('data-source component capabilities (X4)', () => {
  it('component:refresh triggers controller.refresh (fetcher called again)', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'fresh' },
    })) as RendererEnv['fetcher'];

    render(
      <SchemaRenderer
        schemaUrl="test://data/ds-refresh"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'ds',
              action: 'ajax',
              args: { url: '/api/value' },
              name: 'payload',
              initFetch: false,
            },
            {
              type: 'button',
              label: 'Refresh',
              onClick: { action: 'component:refresh', componentId: 'ds' },
            },
            { type: 'text', text: 'Value: ${payload?.value}' },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    // initFetch: false → no auto fetch on mount
    expect(fetcher).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(screen.getByText('Value: fresh')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('component:refresh is skipped (no request) when sendOn is falsy', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'fresh' },
    })) as RendererEnv['fetcher'];

    render(
      <SchemaRenderer
        schemaUrl="test://data/ds-skipped"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'ds',
              action: 'ajax',
              args: { url: '/api/value' },
              name: 'payload',
              initFetch: false,
              sendOn: 'enabled === true',
            },
            {
              type: 'button',
              label: 'Refresh',
              onClick: {
                action: 'component:refresh',
                componentId: 'ds',
                then: {
                  action: 'setValue',
                  args: { path: 'skipFlag', value: '${result.data.skipped}' },
                },
              },
            },
            { type: 'text', text: 'Skip: ${skipFlag}' },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    // enabled is undefined → sendOn falsy → refresh skipped, no fetch
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(screen.getByText('Skip: true')).toBeTruthy());
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('component:cancel aborts the in-flight request', async () => {
    let abortSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const fetcher = vi.fn(async (_api: unknown, ctx: { signal?: AbortSignal }) => {
      abortSignal = ctx.signal;
      return new Promise((resolve, reject) => {
        releaseRequest = resolve as () => void;
        ctx.signal?.addEventListener(
          'abort',
          () => {
            const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
            reject(err);
          },
          { once: true },
        );
      });
    }) as unknown as RendererEnv['fetcher'];

    render(
      <SchemaRenderer
        schemaUrl="test://data/ds-cancel"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'ds',
              action: 'ajax',
              args: { url: '/api/slow' },
              name: 'payload',
              initFetch: false,
              silent: true,
            },
            {
              type: 'button',
              label: 'Refresh',
              onClick: { action: 'component:refresh', componentId: 'ds' },
            },
            {
              type: 'button',
              label: 'Cancel',
              onClick: { action: 'component:cancel', componentId: 'ds' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(abortSignal?.aborted).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(abortSignal?.aborted).toBe(true));

    releaseRequest?.();
  });
});

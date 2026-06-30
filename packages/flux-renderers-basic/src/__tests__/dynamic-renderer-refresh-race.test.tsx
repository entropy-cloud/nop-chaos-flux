import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

// Regression for F4: dynamic-renderer's `run()` is reachable more than once per
// effect lifecycle (initial autoload + the exposed `refresh` capability). The
// post-await abort guard must check the per-invocation controller, not the
// shared `controller` variable — otherwise, on refresh-while-loading, the
// aborted run#1 reads the still-active run#2 controller, fails to recognise its
// own intentional abort, and renders a spurious error state.
describe('dynamic-renderer refresh-while-loading race (F4): per-invocation abort controller', () => {
  it('dyn-refresh-while-loading: aborted run#1 renders no false error and the fresh run#2 schema wins', async () => {
    type FetchResult = { ok: true; status: 200; data: { type: string; text: string } };
    const pendingRelease: Array<() => void> = [];
    const fetcher = vi.fn(
      (_api: unknown, context: unknown) =>
        new Promise<FetchResult>((resolve, reject) => {
          const signal = (context as { signal?: AbortSignal } | undefined)?.signal;
          const release = () =>
            resolve({ ok: true, status: 200, data: { type: 'text', text: 'Fresh schema' } });
          if (signal) {
            if (signal.aborted) {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
              return;
            }
            signal.addEventListener(
              'abort',
              () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
              { once: true },
            );
          }
          pendingRelease.push(release);
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

    expect(fetcher).not.toHaveBeenCalled();

    // run#1: first refresh, request #1 goes in flight on AC1.
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    // run#2: second refresh aborts AC1 and reassigns the shared controller to AC2.
    // AC1's dispatch rejects with AbortError once the abort propagates.
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    // The aborted run#1 must not surface a spurious error state.
    // (Buggy shared-controller guard reads AC2 here, misses AC1's abort, sets error.)
    await waitFor(() => expect(document.querySelector('[data-error]')).toBeNull());

    // The fresh run#2 still completes and its schema wins.
    pendingRelease[pendingRelease.length - 1]?.();
    await waitFor(() => expect(screen.getByText('Fresh schema')).toBeTruthy());
    expect(document.querySelector('[data-error]')).toBeNull();
    cleanup();
  });
});

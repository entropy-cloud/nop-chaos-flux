import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

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
  cleanup();
});

// DD13 regression anchor: dynamic-renderer renders its loaded schema in its OWN
// lexical scope (per-instance), so:
// (a) inside a child (row) scope it reads that scope, not the page root;
// (b) two co-mounted instances loading the SAME schema never collide — each
//     resolves scope bindings against its own location.
// This is the opposite axis of the cache-dedup anchor (A11), which proves a
// shared fetch; here we prove per-instance lexical isolation despite sharing.
describe('dynamic-renderer — lexical / per-instance scope isolation (DD13)', () => {
  it('(a) reads its child (row) scope, not the page root', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'name=${name}' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer-row-scope"
        schema={{
          type: 'page',
          body: [
            { type: 'text', text: 'page-name=${name}' },
            {
              type: 'fragment',
              data: { name: 'RowValue' },
              body: [
                {
                  type: 'dynamic-renderer',
                  loadAction: { action: 'ajax', args: { url: '/api/name' } },
                },
              ],
            },
          ],
        } as any}
        data={{ name: 'PageRoot' }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    // page-level text reads the page root name; the dynamic-renderer inside the
    // fragment's child (row) scope reads the patched "RowValue" — proving the
    // loaded schema renders in the lexical child scope, not the page root.
    await waitFor(() => expect(screen.getByText('page-name=PageRoot')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('name=RowValue')).toBeTruthy());
  });

  it('(b) two same-schema instances in different scopes never collide', async () => {
    const fetcher = createMockFetcher(async () => ({
      ok: true,
      status: 200,
      data: { type: 'text', text: 'Hi ${name}' },
    }));
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/dynamic-renderer-per-instance"
        schema={{
          type: 'page',
          body: [
            {
              type: 'fragment',
              isolate: true,
              data: { name: 'Alice' },
              body: [
                {
                  type: 'dynamic-renderer',
                  loadAction: { action: 'ajax', args: { url: '/api/greet' } },
                },
              ],
            },
            {
              type: 'fragment',
              isolate: true,
              data: { name: 'Bob' },
              body: [
                {
                  type: 'dynamic-renderer',
                  loadAction: { action: 'ajax', args: { url: '/api/greet' } },
                },
              ],
            },
          ],
        } as any}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    // both instances load the identical schema, but each renders in its own
    // isolated scope — no cross-contamination, no collision.
    await waitFor(() => expect(screen.getByText('Hi Alice')).toBeTruthy());
    expect(screen.getByText('Hi Bob')).toBeTruthy();
    expect(screen.getAllByText(/^Hi /)).toHaveLength(2);
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('dialog/drawer surface event dispatch ctx (CX-10 / bug-83 family)', () => {
  it('resolves ${surfaceId} in dialog onConfirm action args via ctx evaluationBindings', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: null })) as unknown as RendererEnv['fetcher'];
    const fetcherMock = vi.mocked(fetcher);
    const SchemaRenderer = createBasicSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#surface-ctx-confirm"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              defaultOpen: true,
              confirm: true,
              onConfirm: {
                action: 'ajax',
                args: { url: '/confirm-${surfaceId}' },
              },
              body: [{ type: 'text', text: 'Dialog body' }],
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const submitButton = screen.getByTestId('surface-confirm-submit');
    fireEvent.click(submitButton);

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const url = (fetcherMock.mock.calls[0]?.[0] as { url?: string } | undefined)?.url ?? '';
    // The ${surfaceId} template must resolve to the real (non-empty) surface id,
    // not the raw template literal and not an empty substitution.
    expect(url).toMatch(/^\/confirm-.+/);
    expect(url).not.toContain('${surfaceId}');
    expect(url).not.toBe('/confirm-');
    cleanup();
  });

  it('resolves the same ${surfaceId} in dialog onConfirm and onClose action args', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: null })) as unknown as RendererEnv['fetcher'];
    const fetcherMock = vi.mocked(fetcher);
    const SchemaRenderer = createBasicSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'dialog',
          title: 'Dialog title',
          open: true,
          confirm: true,
          onConfirm: {
            action: 'ajax',
            args: { url: '/confirm-${surfaceId}' },
          },
          onClose: {
            action: 'ajax',
            args: { url: '/close-${surfaceId}' },
          },
          body: [{ type: 'text', text: 'Dialog body' }],
        },
      ],
    } as const;

    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#surface-ctx-same-id"
        schema={schema}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    // Controlled dialog stays mounted: fire close first, capture the resolved
    // surfaceId, then confirm with the same id.
    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      const calls = fetcherMock.mock.calls;
      expect(calls.some((call) => (call[0] as { url?: string })?.url?.startsWith('/close-'))).toBe(true);
    });
    const closeUrl = fetcherMock.mock.calls
      .map((call) => (call[0] as { url?: string })?.url ?? '')
      .find((url) => url.startsWith('/close-')) ?? '';
    const surfaceId = closeUrl.slice('/close-'.length);
    expect(surfaceId.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('surface-confirm-submit'));

    await waitFor(() => {
      const calls = fetcherMock.mock.calls;
      expect(calls.some((call) => (call[0] as { url?: string })?.url === `/confirm-${surfaceId}`)).toBe(true);
    });
    cleanup();
  });

  it('resolves ${surfaceId} in drawer onClose action args via ctx evaluationBindings', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: null })) as unknown as RendererEnv['fetcher'];
    const fetcherMock = vi.mocked(fetcher);
    const SchemaRenderer = createBasicSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#surface-ctx-drawer"
        schema={{
          type: 'page',
          body: [
            {
              type: 'drawer',
              title: 'Drawer title',
              defaultOpen: true,
              onClose: {
                action: 'ajax',
                args: { url: '/drawer-close-${surfaceId}' },
              },
              body: [{ type: 'text', text: 'Drawer body' }],
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="drawer-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const url = (fetcherMock.mock.calls[0]?.[0] as { url?: string } | undefined)?.url ?? '';
    expect(url).toMatch(/^\/drawer-close-.+/);
    expect(url).not.toContain('${surfaceId}');
    cleanup();
  });
});

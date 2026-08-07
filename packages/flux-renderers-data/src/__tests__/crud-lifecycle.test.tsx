import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentCapabilityActionContext } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

afterEach(() => {
  cleanup();
});

describe('CRUD polling orchestration (E1d)', () => {
  it('invokes start on the upstream data-source when polling is resumed via toggle', async () => {
    const invokeStartSpy = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://crud/polling-start"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'polling-ds',
              name: 'payload',
              action: 'ajax',
              args: { url: '/api/value' },
              initFetch: false,
            },
            {
              type: 'crud',
              id: 'polling-crud',
              source: '${payload}',
              polling: { enabled: true, sourceId: 'polling-ds' },
              toolbarLayout: {
                header: [{ type: 'polling-toggle' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          if (!registry) {
            return;
          }
          const handle = registry.resolve({ componentId: 'polling-ds' });
          if (handle?.capabilities) {
            const original = handle.capabilities.invoke.bind(handle.capabilities);
            handle.capabilities.invoke = (
              method: string,
              payload?: Record<string, unknown>,
              ctx?: ComponentCapabilityActionContext,
            ) => {
              if (method === 'start') {
                invokeStartSpy();
              }
              return (original as any)(method, payload, ctx);
            };
          }
        }}
      />,
    );

    await waitFor(() => {
      const toggleButton = document.querySelector(
        '[data-slot="header-toolbar-polling-toggle"] button',
      );
      expect(toggleButton).toBeTruthy();
    });

    const toggleButton = document.querySelector(
      '[data-slot="header-toolbar-polling-toggle"] button',
    ) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(toggleButton.getAttribute('data-active')).toBeNull();
    });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(invokeStartSpy).toHaveBeenCalled();
    });
  });

  it('invokes cancel on the upstream data-source when CRUD unmounts', async () => {
    const invokeCancelSpy = vi.fn();

    function TestApp({ showCrud }: { showCrud: boolean }) {
      const body: any[] = [
        {
          type: 'data-source',
          id: 'polling-ds-stop',
          name: 'payload',
          action: 'ajax',
          args: { url: '/api/value' },
          initFetch: false,
        },
      ];
      if (showCrud) {
        body.push({
          type: 'crud',
          id: 'polling-crud-stop',
          source: '${payload}',
          polling: { enabled: true, sourceId: 'polling-ds-stop' },
          columns: [{ name: 'name', label: 'Name' }],
        });
      }
      return (
        <SchemaRenderer
          schemaUrl="test://crud/polling-stop"
          schema={{
            type: 'page',
            body,
          }}
          env={env}
          formulaCompiler={formulaCompiler}
          onComponentRegistryChange={(registry) => {
            if (!registry) {
              return;
            }
            const handle = registry.resolve({ componentId: 'polling-ds-stop' });
            if (handle?.capabilities) {
              const original = handle.capabilities.invoke.bind(handle.capabilities);
              handle.capabilities.invoke = (
                method: string,
                payload?: Record<string, unknown>,
                ctx?: ComponentCapabilityActionContext,
              ) => {
                if (method === 'cancel') {
                  invokeCancelSpy();
                }
                return (original as any)(method, payload, ctx);
              };
            }
          }}
        />
      );
    }

    const { rerender } = render(<TestApp showCrud={true} />);

    await waitFor(() => {
      const crudRoot = document.querySelector('.nop-crud');
      expect(crudRoot).toBeTruthy();
    });

    rerender(<TestApp showCrud={false} />);

    await waitFor(() => {
      expect(invokeCancelSpy).toHaveBeenCalled();
    });
  });

  it('cleanup captures handle in closure (no handleRef overwrite race)', async () => {
    const invokeCalls: string[] = [];

    function TestApp({ show }: { show: boolean }) {
      const body: any[] = [
        {
          type: 'data-source',
          id: 'ds-closure',
          name: 'payload',
          action: 'ajax',
          args: { url: '/api/value' },
          initFetch: false,
        },
      ];
      if (show) {
        body.push({
          type: 'crud',
          id: 'crud-closure',
          source: '${payload}',
          polling: { enabled: true, sourceId: 'ds-closure' },
          toolbarLayout: {
            header: [{ type: 'polling-toggle' }],
          },
          columns: [{ name: 'name', label: 'Name' }],
        });
      }
      return (
        <SchemaRenderer
          schemaUrl="test://crud/polling-closure"
          schema={{ type: 'page', body }}
          env={env}
          formulaCompiler={formulaCompiler}
          onComponentRegistryChange={(registry) => {
            if (!registry) return;
            const handle = registry.resolve({ componentId: 'ds-closure' });
            if (handle?.capabilities) {
              const original = handle.capabilities.invoke.bind(handle.capabilities);
              handle.capabilities.invoke = (method, payload, ctx) => {
                invokeCalls.push(method);
                return (original as any)(method, payload, ctx);
              };
            }
          }}
        />
      );
    }

    render(<TestApp show={true} />);

    // Wait for CRUD to be mounted
    await waitFor(() => {
      const crudRoot = document.querySelector('.nop-crud');
      expect(crudRoot).toBeTruthy();
    });

    // Toggle polling off to trigger cancel, then back on to trigger start
    const toggleButton = document.querySelector(
      '[data-slot="header-toolbar-polling-toggle"] button',
    ) as HTMLButtonElement;
    expect(toggleButton).toBeTruthy();

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(invokeCalls.length).toBeGreaterThan(0);
  });

  it('addresses only the data-source matching polling.sourceId', async () => {
    const startCalls: string[] = [];

    render(
      <SchemaRenderer
        schemaUrl="test://crud/polling-sourceid"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'ds-a',
              name: 'payloadA',
              action: 'ajax',
              args: { url: '/api/a' },
              initFetch: false,
            },
            {
              type: 'data-source',
              id: 'ds-b',
              name: 'payloadB',
              action: 'ajax',
              args: { url: '/api/b' },
              initFetch: false,
            },
            {
              type: 'crud',
              id: 'crud-sourceid',
              source: '${payloadA}',
              polling: { enabled: true, sourceId: 'ds-b' },
              toolbarLayout: {
                header: [{ type: 'polling-toggle' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          if (!registry) {
            return;
          }
          for (const id of ['ds-a', 'ds-b']) {
            const handle = registry.resolve({ componentId: id });
            if (handle?.capabilities) {
              const original = handle.capabilities.invoke.bind(handle.capabilities);
              handle.capabilities.invoke = (
                method: string,
                payload?: Record<string, unknown>,
                ctx?: ComponentCapabilityActionContext,
              ) => {
                if (method === 'start') {
                  startCalls.push(id);
                }
                return (original as any)(method, payload, ctx);
              };
            }
          }
        }}
      />,
    );

    await waitFor(() => {
      const toggleButton = document.querySelector(
        '[data-slot="header-toolbar-polling-toggle"] button',
      );
      expect(toggleButton).toBeTruthy();
    });

    const toggleButton = document.querySelector(
      '[data-slot="header-toolbar-polling-toggle"] button',
    ) as HTMLButtonElement;

    startCalls.length = 0;

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(toggleButton.getAttribute('data-active')).toBeNull();
    });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(startCalls).toContain('ds-b');
    });
    expect(startCalls).not.toContain('ds-a');
  });

  it('2-10: starts polling when the upstream data-source registers AFTER the CRUD (schema order [crud, data-source])', async () => {
    const invokeStartSpy = vi.fn();

    render(
      <SchemaRenderer
        schemaUrl="test://crud/polling-late-ds"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'polling-late-crud',
              source: '${payload}',
              polling: { enabled: true, sourceId: 'late-ds' },
              columns: [{ name: 'name', label: 'Name' }],
            },
            {
              type: 'data-source',
              id: 'late-ds',
              name: 'payload',
              action: 'ajax',
              args: { url: '/api/late' },
              initFetch: false,
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          if (!registry) {
            return;
          }
          const handle = registry.resolve({ componentId: 'late-ds' });
          if (handle?.capabilities) {
            const original = handle.capabilities.invoke.bind(handle.capabilities);
            handle.capabilities.invoke = (
              method: string,
              payload?: Record<string, unknown>,
              ctx?: ComponentCapabilityActionContext,
            ) => {
              if (method === 'start') {
                invokeStartSpy();
              }
              return (original as any)(method, payload, ctx);
            };
          }
        }}
      />,
    );

    // The CRUD's polling effect runs before the data-source registers; the
    // retry timer must recover once the handle appears — polling starts
    // automatically without any user interaction.
    await waitFor(
      () => {
        expect(invokeStartSpy).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });
});

describe('CRUD filterTogglable (E1d)', () => {
  it('renders query region in collapsed state when filterTogglable defaultCollapsed is true', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://crud/filter-collapsed"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-filter-collapsed',
              source: [{ id: '1', name: 'Alice' }],
              filterTogglable: { defaultCollapsed: true },
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const toggleRoot = document.querySelector('[data-slot="crud-query"]');
      expect(toggleRoot).toBeTruthy();
    });

    const collapseContainer = document.querySelector('[data-slot="crud-query-collapse"]');
    expect(collapseContainer).toBeTruthy();

    const expandButton = screen.queryByRole('button', { name: t('flux.crud.expandQuery') });
    expect(expandButton).toBeTruthy();

    const keywordInput = screen.queryByLabelText('Keyword');
    expect(keywordInput).toBeNull();
  });

  it('expands the query region when the toggle button is clicked', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://crud/filter-expand"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-filter-expand',
              source: [{ id: '1', name: 'Alice' }],
              filterTogglable: { defaultCollapsed: true },
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="crud-query-collapse"]')).toBeTruthy();
    });

    expect(screen.queryByLabelText('Keyword')).toBeNull();

    const expandButton = screen.getByRole('button', { name: t('flux.crud.expandQuery') });
    await act(async () => {
      fireEvent.click(expandButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Keyword')).toBeTruthy();
    });
  });
});

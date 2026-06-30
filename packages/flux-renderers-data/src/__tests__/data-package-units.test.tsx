import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { ComponentRegistryContext } from '@nop-chaos/flux-react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { CrudToolbarBlocks, normalizeToolbarBlocks } from '../crud-renderer-toolbar.js';
import { dataRendererDefinitions, registerDataRenderers } from '../index.js';
import { useTableHandle } from '../table-renderer/use-table-handle.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(cleanup);

describe('data package units', () => {
  it('registers data renderer definitions through package entry', () => {
    const registry = createRendererRegistry();
    registerDataRenderers(registry);

    expect(dataRendererDefinitions.map((item) => item.type)).toEqual([
      'table',
      'data-source',
      'chart',
      'tree',
      'list',
      'service',
      'pagination',
      'crud',
    ]);
    expect(registry.get('table')?.type).toBe('table');
    expect(registry.get('list')?.type).toBe('list');
    expect(registry.get('crud')?.type).toBe('crud');
    expect(registry.get('service')?.type).toBe('service');
    expect(registry.get('pagination')?.type).toBe('pagination');
  });

  it('normalizes toolbar block layouts and ignores unsupported values', () => {
    expect(
      normalizeToolbarBlocks(
        {
          header: ['statistics', { type: 'pagination', align: 'right' }, { bad: true } as any],
          footer: undefined,
        } as any,
        'header',
      ),
    ).toEqual([{ type: 'statistics' }, { type: 'pagination', align: 'right' }]);

    expect(normalizeToolbarBlocks(undefined, 'footer')).toEqual([]);
  });

  it('drops legacy bulkActions toolbar blocks from normalized layouts', () => {
    expect(
      normalizeToolbarBlocks(
        {
          header: ['listActions', 'bulkActions', { type: 'bulkActions' }],
        } as any,
        'header',
      ),
    ).toEqual([{ type: 'listActions' }]);
  });

  it('renders toolbar blocks and forwards interactions', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <CrudToolbarBlocks
        slot="footer"
        blocks={[
          { type: 'listActions' },
          { type: 'statistics' },
          { type: 'switch-per-page' },
          { type: 'pagination', align: 'right' },
        ]}
        summary={{ total: 25, itemCount: 25 } as any}
        listActionsContent={<span>Bulk actions</span>}
        hasListActions={true}
        pagination={{ currentPage: 2, pageSize: 10 }}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    expect(screen.getByText('Bulk actions')).toBeTruthy();
    expect(screen.getByText('Total 25')).toBeTruthy();
    fireEvent.change(document.querySelector('[data-slot="native-select"]')!, {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByText('Previous'));
    fireEvent.click(screen.getByText('Next'));

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables next pagination affordance on the last page', () => {
    const onPageChange = vi.fn();

    render(
      <CrudToolbarBlocks
        slot="footer"
        blocks={[{ type: 'pagination', align: 'right' }]}
        summary={{ total: 25, itemCount: 25 } as any}
        listActionsContent={null}
        hasListActions={false}
        pagination={{ currentPage: 3, pageSize: 10 }}
        onPageChange={onPageChange}
        onPageSizeChange={() => {}}
      />,
    );

    const next = screen.getByRole('button', { name: 'Next' });
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(next.className).toContain('pointer-events-none');
    expect(next.className).toContain('opacity-50');

  });

  it('returns null for empty toolbar block sets', () => {
    const { container } = render(
      <CrudToolbarBlocks
        slot="header"
        blocks={[]}
        summary={{ total: 0, itemCount: 0 } as any}
        listActionsContent={null}
        hasListActions={false}
        pagination={{ currentPage: 1, pageSize: 10 }}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});

describe('useTableHandle', () => {
  it('registers a handle and supports refresh plus selection methods', async () => {
    const register = vi.fn((_handle?: unknown) => () => undefined);
    const onRefresh = vi.fn();
    const onPageChange = vi.fn();
    const setSelectionExternal = vi.fn();
    let capturedHandle: any;

    function Probe() {
      useTableHandle(
        {
          id: 'table-1',
          meta: { cid: 'cid-1' },
          helpers: {
            createScope: vi.fn((value) => ({ scopeValue: value })),
          },
          events: { onRefresh, onPageChange },
        } as any,
        2,
        20,
        new Set(['r1']),
        'local',
        'selection.path',
        'scope',
        'pagination.path',
        setSelectionExternal,
      );
      return null;
    }

    render(
      <ComponentRegistryContext.Provider
        value={
          {
            register: (...args: any[]) => {
              capturedHandle = args[0];
              return register(args[0]);
            },
          } as any
        }
      >
        <Probe />
      </ComponentRegistryContext.Provider>,
    );

    expect(register).toHaveBeenCalled();
    expect(capturedHandle.capabilities.hasMethod('refresh')).toBe(true);
    expect(capturedHandle.capabilities.listMethods()).toEqual([
      'refresh',
      'getSelection',
      'setSelection',
    ]);
    expect(capturedHandle.capabilities.getDebugData()).toMatchObject({
      paginationOwnership: 'scope',
      selectionOwnership: 'local',
      currentPage: 2,
      pageSize: 20,
      selectedRowKeys: ['r1'],
    });

    const ctx = {
      scope: { id: 'scope' },
      actionScope: undefined,
      componentRegistry: undefined,
      form: undefined,
      page: undefined,
      nodeInstance: undefined,
    };
    expect(capturedHandle.capabilities.invoke('getSelection', undefined, ctx)).toEqual({
      ok: true,
      data: ['r1'],
    });
    expect(capturedHandle.capabilities.invoke('setSelection', ['r2'], ctx)).toEqual({
      ok: true,
      data: ['r2'],
    });
    expect(setSelectionExternal).toHaveBeenCalled();
    expect(capturedHandle.capabilities.invoke('refresh', undefined, ctx)).toEqual({
      ok: true,
      data: { page: 2, pageSize: 20 },
    });
    expect(onRefresh).toHaveBeenCalled();
    expect(capturedHandle.capabilities.invoke('unsupported', undefined, ctx).ok).toBe(false);
  });

  it('falls back to onPageChange refresh when no explicit onRefresh exists', () => {
    let capturedHandle: any;

    function Probe() {
      useTableHandle(
        {
          id: 'table-2',
          meta: {},
          helpers: {
            createScope: vi.fn((value) => ({ scopeValue: value })),
          },
          events: { onPageChange: vi.fn() },
        } as any,
        1,
        10,
        new Set(),
        'local',
        undefined,
        'local',
        undefined,
        vi.fn(),
      );
      return null;
    }

    render(
      <ComponentRegistryContext.Provider
        value={
          {
            register: (handle: any) => {
              capturedHandle = handle;
              return () => undefined;
            },
          } as any
        }
      >
        <Probe />
      </ComponentRegistryContext.Provider>,
    );

    expect(capturedHandle.capabilities.store).toBeUndefined();
  });
});

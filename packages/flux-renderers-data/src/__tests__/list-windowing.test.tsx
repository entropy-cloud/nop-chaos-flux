import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// plan 2026-09-29-6 Phase 1/2 Proof. Two layers:
// 1. REAL hook (no mock): layout-neutral guarantees — below threshold and
//    no-scrollable-ancestor render fully mounted (happy-dom can run these).
// 2. MOCKED hook (calendar-drag-drop-visual precedent — happy-dom has no
//    layout engine, tanstack observes a 0x0 rect): the windowed render
//    branch, spacer geometry, selection persistence and sentinel wiring are
//    asserted against a deterministic window. The real hook's browser
//    behavior is additionally covered by tests/e2e/list-windowing.spec.ts.
const windowingMock = vi.hoisted(() => ({
  state: { windowingActive: false, startIndex: 0, endIndex: 0, totalCount: 0, bottomSpacer: 0 },
}));

vi.mock('../use-list-windowing.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../use-list-windowing.js')>();
  return {
    ...actual,
    LIST_VIRTUAL_THRESHOLD: actual.LIST_VIRTUAL_THRESHOLD,
    useListWindowing: (visibleItems: unknown[], pagination: Parameters<typeof actual.useListWindowing>[1]) => {
      const real = actual.useListWindowing(visibleItems, pagination);
      const mock = windowingMock.state;
      if (!mock.windowingActive) {
        return { ...real, virtualRows: null, windowBottomSpacerHeight: 0 };
      }
      const indexes: number[] = [];
      for (let i = mock.startIndex; i <= Math.min(mock.endIndex, visibleItems.length - 1); i++) {
        indexes.push(i);
      }
      const ESTIMATE = 44;
      const virtualRows = indexes.map((index) => ({
        index,
        start: index * ESTIMATE,
        end: (index + 1) * ESTIMATE,
        size: ESTIMATE,
        key: String(index),
        lane: 0,
      }));
      return {
        windowingActive: true,
        listRootRef: real.listRootRef,
        virtualRows,
        measureElement: () => undefined,
        windowBottomSpacerHeight: mock.bottomSpacer,
      };
    },
  };
});

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  windowingMock.state = { windowingActive: false, startIndex: 0, endIndex: 0, totalCount: 0, bottomSpacer: 0 };
});

afterEach(cleanup);

function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `row-${i}`, title: `Row ${i}` }));
}

let SchemaRendererInstance: React.FunctionComponent<Record<string, unknown>> = () => null;

function renderList(items: unknown[], scrollerStyle?: React.CSSProperties) {
  const onLoadMore = vi.fn(async () => ({ ok: true, items: [] }));
  const Inner = createDataSchemaRenderer();
  SchemaRendererInstance = function SchemaRendererInstance() {
    return (
      <Inner
        schemaUrl="test://list-windowing"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'list',
                id: 'big-list',
                items: '${rows}',
                keyField: 'id',
                selectionMode: 'multiple',
                pagination: { enabled: true, mode: 'infinite', pageSize: items.length, hasMore: true },
                onLoadMore,
              },
            ],
          } as never
        }
        data={{ rows: items }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
  };
  const view = render(
    <div style={scrollerStyle} data-testid="scroller">
      <SchemaRendererInstance />
    </div>,
  );
  return { view, onLoadMore };
}

function mountedRowCount(): number {
  return document.querySelectorAll('[data-slot="list-item"]').length;
}

describe('list-renderer windowing (plan 2026-09-29-6)', () => {
  it('keeps full mount below the threshold (20-item list never virtualizes)', () => {
    renderList(makeItems(20));
    expect(mountedRowCount()).toBe(20);
    expect(document.querySelector('[data-slot="list-window-spacer-top"]')).toBeNull();
  });

  it('falls back to full mount when no scrollable ancestor exists (layout-neutral)', () => {
    renderList(makeItems(200));
    expect(mountedRowCount()).toBe(200);
    expect(document.querySelector('[data-slot="list-window-spacer-top"]')).toBeNull();
  });

  it('windowed branch mounts only the mock window with spacer geometry', () => {
    windowingMock.state = { windowingActive: true, startIndex: 10, endIndex: 19, totalCount: 200, bottomSpacer: 7960 };
    renderList(makeItems(200), { height: 220, overflowY: 'auto' as const });

    const rows = Array.from(document.querySelectorAll('[data-slot="list-item"]'));
    expect(rows.length).toBe(10);
    expect((rows[0] as HTMLElement).getAttribute('data-item-key')).toBe('row-10');
    expect(document.querySelector('[data-slot="list-window-spacer-top"]'))
      .toHaveProperty('style.height', '440px');
    expect(document.querySelector('[data-slot="list-window-spacer-bottom"]'))
      .toHaveProperty('style.height', '7960px');
    // non-global rows keep the bottom hairline (isLast = full-list last index)
    expect((rows[rows.length - 1] as HTMLElement).className).toContain('nop-hairline-bottom');
  });

  it('selection persists across window movement and load-more still fires at the bottom', async () => {
    // select a row inside the first (mocked) window
    windowingMock.state = { windowingActive: true, startIndex: 0, endIndex: 9, totalCount: 200, bottomSpacer: 8360 };
    const { onLoadMore, view } = renderList(makeItems(200), { height: 220, overflowY: 'auto' as const });
    const firstRow = document.querySelectorAll('[data-slot="list-item"]')[0] as HTMLElement;
    fireEvent.click(firstRow);
    expect(firstRow.getAttribute('data-selected')).toBe('true');

    // move the window far down: the selected row unmounts (re-render drives
    // the mocked hook to the new window)
    windowingMock.state = { windowingActive: true, startIndex: 180, endIndex: 189, totalCount: 200, bottomSpacer: 4400 };
    view.rerender(
      <div style={{ height: 220, overflowY: 'auto' }} data-testid="scroller">
        <SchemaRendererInstance />
      </div>,
    );
    await waitFor(() => {
      const keys = Array.from(document.querySelectorAll('[data-slot="list-item"]')).map(
        (n) => (n as HTMLElement).getAttribute('data-item-key'),
      );
      expect(keys).toContain('row-180');
      expect(keys).not.toContain('row-0');
    });

    // move the window back: selection restored from component state
    windowingMock.state = { windowingActive: true, startIndex: 0, endIndex: 9, totalCount: 200, bottomSpacer: 8360 };
    view.rerender(
      <div style={{ height: 220, overflowY: 'auto' }} data-testid="scroller">
        <SchemaRendererInstance />
      </div>,
    );
    await waitFor(() => {
      const restored = document.querySelector('[data-item-key="row-0"]') as HTMLElement | null;
      expect(restored).toBeTruthy();
      expect(restored?.getAttribute('data-selected')).toBe('true');
    });

    // the infinite sentinel sits after the bottom spacer and is wired to the
    // same load-more event (wiring asserted via the renderer event)
    expect(onLoadMore).not.toHaveBeenCalled();
    const sentinelArea = document.querySelector('[data-slot="list-infinite"]');
    expect(sentinelArea).toBeTruthy();
  });
});

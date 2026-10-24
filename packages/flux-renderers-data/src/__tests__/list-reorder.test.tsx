import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const ROWS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

function stubDataTransfer() {
  return {
    setData: vi.fn(),
    getData: vi.fn(),
    effectAllowed: undefined as string | undefined,
    dropEffect: undefined as string | undefined,
  };
}

function renderList(schemaExtra: Record<string, unknown>, data: Record<string, unknown> = { rows: ROWS }) {
  const onReorder = vi.fn();
  const SchemaRenderer = createDataSchemaRenderer();
  render(
    <SchemaRenderer
      schemaUrl="test://data/list-reorder"
      schema={{
        type: 'page',
        body: [
          {
            type: 'list',
            keyField: 'id',
            items: '${rows}',
            item: { type: 'text', text: '${$slot.item.label}' },
            ...schemaExtra,
          },
        ],
      }}
      data={data}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
  return { onReorder };
}

function handles() {
  return Array.from(document.querySelectorAll('[data-slot="list-item-drag-handle"]'));
}

function itemLabels() {
  return Array.from(document.querySelectorAll('[data-slot="list-item"]')).map(
    (el) => el.textContent ?? '',
  );
}

describe('list reorderable (arc-component-gap G6I discriminant)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a drag handle per item when enabled; zero handles when absent (paired discriminant)', async () => {
    renderList({ reorderable: true });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(handles().length).toBe(3);
    expect(handles()[0]?.getAttribute('role')).toBe('button');
    expect(handles()[0]?.getAttribute('aria-label')).toBe('Drag to reorder');
    cleanup();

    renderList({});
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(handles().length).toBe(0);
  });

  it('drop dispatches onReorder once with { type, items, keys } in the new order', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-reorder-drop"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              keyField: 'id',
              reorderable: true,
              onReorder: { action: 'setValue', args: { path: 'rows', value: '${items}' } },
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    const alphaHandle = handles()[0] as HTMLElement;
    const gammaHandle = handles()[2] as HTMLElement;
    const transfer = stubDataTransfer();
    fireEvent.dragStart(alphaHandle, { dataTransfer: transfer });
    fireEvent.dragOver(gammaHandle, { dataTransfer: stubDataTransfer() });
    // process-state markers (design.md §10)
    expect(
      document.querySelector('[data-slot="list-item"][data-dragging="true"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-slot="list-item"][data-drag-over="true"]')).toBeTruthy();
    fireEvent.drop(gammaHandle, { dataTransfer: stubDataTransfer() });

    await waitFor(() => expect(itemLabels().join('|')).toBe('Beta|Gamma|Alpha'));
    expect(screen.queryByText('Alpha')).toBeTruthy();
    expect(itemLabels()[0]).toContain('Beta');
  });

  it('keyboard ArrowDown moves the item and dispatches per move', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-reorder-keyboard"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              keyField: 'id',
              reorderable: true,
              onReorder: { action: 'setValue', args: { path: 'rows', value: '${items}' } },
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    fireEvent.keyDown(handles()[0] as HTMLElement, { key: 'ArrowDown' });
    await waitFor(() => expect(itemLabels().join('|')).toBe('Beta|Alpha|Gamma'));

    // Alpha now sits at index 1 — find its handle again after the re-render.
    const alphaItem = Array.from(document.querySelectorAll('[data-slot="list-item"]')).find(
      (el) => el.textContent?.includes('Alpha'),
    ) as HTMLElement;
    fireEvent.keyDown(
      alphaItem.querySelector('[data-slot="list-item-drag-handle"]') as HTMLElement,
      { key: 'ArrowDown' },
    );
    await waitFor(() => expect(itemLabels().join('|')).toBe('Beta|Gamma|Alpha'));
  });

  it('handle click does not trigger item selection', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-reorder-selection"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              keyField: 'id',
              selectionMode: 'single',
              reorderable: true,
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    fireEvent.click(handles()[0] as HTMLElement);
    expect(document.querySelector('[data-slot="list-item"][data-selected="true"]')).toBeNull();
  });

  it('drops without an onReorder declaration are inert (no throw, order unchanged)', async () => {
    renderList({ reorderable: true });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    const [first, last] = handles() as HTMLElement[];
    fireEvent.dragStart(first, { dataTransfer: stubDataTransfer() });
    expect(() => fireEvent.drop(last, { dataTransfer: stubDataTransfer() })).not.toThrow();
    expect(itemLabels().join('|')).toBe('Alpha|Beta|Gamma');
  });

  it('gates: missing keyField / paged pagination / windowing disable reorder with dev warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    // (1) items without the keyField value → fallback index keys (default keyField 'id' misses)
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-reorder-gate1"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              reorderable: true,
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: [{ label: 'Alpha' }, { label: 'Beta' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(handles().length).toBe(0);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing-explicit-keys')),
    );
    cleanup();
    warn.mockClear();

    // (2) paged pagination
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-reorder-gate2"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              keyField: 'id',
              reorderable: true,
              pagination: { enabled: true, mode: 'page', pageSize: 2, total: 3 },
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: ROWS }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(handles().length).toBe(0);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('paged-pagination')),
    );
    cleanup();
    warn.mockClear();

    // (3) windowing: infinite mode above the virtual threshold (LIST_VIRTUAL_THRESHOLD = 150)
    const manyRows = Array.from({ length: 160 }, (_, i) => ({ id: `k${i}`, label: `Item${i}` }));
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-reorder-gate3"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              keyField: 'id',
              reorderable: true,
              pagination: { enabled: true, mode: 'infinite', pageSize: 200, total: 160 },
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: manyRows }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('windowing')));
    expect(handles().length).toBe(0);
  });
});

describe('list reorderable regression pin (default path)', () => {
  afterEach(() => {
    cleanup();
  });

  it('schema without reorderable renders no data-dragging/data-drag-over markers', async () => {
    renderList({});
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    fireEvent.dragStart(document.querySelector('[data-slot="list-item"]') as HTMLElement, {
      dataTransfer: stubDataTransfer(),
    });
    expect(document.querySelector('[data-dragging]')).toBeNull();
    expect(document.querySelector('[data-drag-over]')).toBeNull();
  });
});

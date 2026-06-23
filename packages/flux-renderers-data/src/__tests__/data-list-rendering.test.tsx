import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('dataRendererDefinitions list rendering', () => {
  afterEach(() => {
    cleanup();
  });

  it('instantiates the item region once per collection entry with per-item scope (item/index)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-item-render"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              item: {
                type: 'text',
                text: '${$slot.item.label}:${$slot.index}',
              },
            },
          ],
        }}
        data={{
          rows: [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
            { id: 'c', label: 'Gamma' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha:0')).toBeTruthy();
      expect(screen.getByText('Beta:1')).toBeTruthy();
      expect(screen.getByText('Gamma:2')).toBeTruthy();
    });

    const listRoot = document.querySelector('.nop-list');
    expect(listRoot).toBeTruthy();
    const itemNodes = listRoot?.querySelectorAll('[data-slot="list-item"]');
    expect(itemNodes?.length).toBe(3);
  });

  it('renders the empty region/value when items is an empty array', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-empty-array"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              empty: { type: 'text', text: 'No entries' },
            },
          ],
        }}
        data={{ rows: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('No entries')).toBeTruthy();
    const listRoot = document.querySelector('.nop-list');
    expect(listRoot?.getAttribute('data-empty')).toBe('true');
    expect(listRoot?.querySelector('[data-slot="list-empty"]')?.textContent).toContain('No entries');
    expect(listRoot?.querySelectorAll('[data-slot="list-item"]').length).toBe(0);
  });

  it('renders the empty state when items resolves to null/undefined (single items field, no crash)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-empty-null"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              empty: { type: 'text', text: 'Nothing loaded' },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Nothing loaded')).toBeTruthy();
  });

  it('dispatches onItemClick against the per-item scope carrying item/index context', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-onitemclick"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              onItemClick: {
                action: 'openDialog',
                args: {
                  title: 'Item click',
                  body: [{ type: 'text', text: 'Clicked ${item.name} at ${index}' }],
                },
              },
              item: { type: 'text', text: '${$slot.item.name}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(await screen.findByText('Bob'));

    await waitFor(() => {
      expect(screen.getByText('Item click')).toBeTruthy();
    });
    expect(
      screen.getByText((content) => content.includes('Clicked') && content.includes('Bob') && content.includes('at 1')),
    ).toBeTruthy();
  });

  it('keeps selection off when selectionMode is "none" (not selectable)', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-selection-none"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              selectionMode: 'none',
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    const items = document.querySelectorAll('[data-slot="list-item"]');
    expect(items.length).toBe(2);
    fireEvent.click(items[0]);

    expect(document.querySelector('[data-slot="list-item"][data-selected="true"]')).toBeNull();
    expect(items[0].getAttribute('aria-selected')).toBeNull();
  });

  it('applies single-selection mutual exclusion and reports selection change', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-selection-single"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              selectionMode: 'single',
              testid: 'single-list',
              items: '${rows}',
              onSelectionChange: {
                action: 'setValue',
                args: { path: 'selectionReported', value: true },
              },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
            {
              type: 'text',
              text: 'selection:${selectionReported ? "reported" : "pending"}',
            },
          ],
        }}
        data={{ rows: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    const items = document.querySelectorAll('[data-slot="list-item"]');
    fireEvent.click(items[0]);

    await waitFor(() => {
      expect(items[0].getAttribute('data-selected')).toBe('true');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
    });
    await waitFor(() => expect(screen.getByText('selection:reported')).toBeTruthy());

    fireEvent.click(items[1]);

    await waitFor(() => {
      expect(items[1].getAttribute('data-selected')).toBe('true');
      expect(items[0].getAttribute('data-selected')).toBeNull();
    });
  });

  it('accumulates selection when selectionMode is "multiple"', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-selection-multiple"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              selectionMode: 'multiple',
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{
          rows: [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
            { id: 'c', label: 'Gamma' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Gamma')).toBeTruthy());

    const items = document.querySelectorAll('[data-slot="list-item"]');
    fireEvent.click(items[0]);
    fireEvent.click(items[2]);

    await waitFor(() => {
      expect(items[0].getAttribute('data-selected')).toBe('true');
      expect(items[2].getAttribute('data-selected')).toBe('true');
      expect(items[1].getAttribute('data-selected')).toBeNull();
    });

    expect(
      document.querySelectorAll('[data-slot="list-item"][data-selected="true"]').length,
    ).toBe(2);
  });

  it('derives a stable item key from keyField and falls back to index', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-key-field"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              keyField: 'code',
              items: '${rows}',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows: [{ code: 'x1', label: 'First' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('First')).toBeTruthy());
    const item = document.querySelector('[data-slot="list-item"]');
    expect(item?.getAttribute('data-item-key')).toBe('x1');
  });
});

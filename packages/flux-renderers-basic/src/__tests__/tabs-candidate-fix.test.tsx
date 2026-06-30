import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// L8 regression anchor: locks the tabs candidate-fix (design.md §10) that
// corrects the active value when it disappears from `items` — keep → nearest
// right → nearest left → empty — instead of silently clamping the derived index
// to 0 while the owned value stays stale (no trigger selected, no panel rendered).
//
// Note: `items` is expression-sourced (`${ui.tabItems}`) so it can mutate at
// runtime. Expression items are plain data (body regions are not compiled for
// expression results), so this anchor asserts the active VALUE correction via
// statusPath + trigger aria-selected — which is exactly what candidate-fix owns.
// Scope is "removed" items; item-level visible/hidden meta is a separate axis.
describe('TabsRenderer — candidate-fix when active item is removed (L8)', () => {
  afterEach(() => {
    cleanup();
  });

  const itemsABC = [
    { key: 'a', title: 'A' },
    { key: 'b', title: 'B' },
    { key: 'c', title: 'C' },
  ];

  function statusText() {
    return screen.getByText(/^active=/);
  }

  function buildSchema(mutateActionArgs: Record<string, unknown>, defaultValue = 'b'): any {
    return {
      type: 'page',
      body: [
        {
          type: 'tabs',
          statusPath: 'ui.tabsStatus',
          defaultValue,
          items: '${ui.tabItems}',
        },
        {
          type: 'button',
          label: 'Mutate',
          onClick: { action: 'setValue', args: mutateActionArgs },
        },
        {
          type: 'text',
          text: 'active=${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}',
        },
      ],
    };
  }

  it('keeps the active value when it still exists (no spurious write-back)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/candidate-keep"
        schema={buildSchema({ path: 'ui.tabItems', value: itemsABC })}
        data={{ ui: { tabItems: itemsABC } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(statusText().textContent).toBe('active=b:1'));
    expect(screen.getByRole('tab', { name: 'B' }).getAttribute('aria-selected')).toBe('true');
  });

  it('falls to nearest-right item when the active tab is removed', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/candidate-nearest-right"
        schema={buildSchema({
          path: 'ui.tabItems',
          value: [
            { key: 'a', title: 'A' },
            { key: 'c', title: 'C' },
          ],
        })}
        data={{ ui: { tabItems: itemsABC } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // b seeds active at index 1
    await waitFor(() => expect(statusText().textContent).toBe('active=b:1'));

    fireEvent.click(screen.getByText('Mutate'));

    // removed b (was index 1) → nearest-right is the item now at index 1 ("c"),
    // never a stale "b" value with a silently-clamped index 0.
    await waitFor(() => expect(statusText().textContent).toBe('active=c:1'));
    expect(screen.getByRole('tab', { name: 'C' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tab', { name: 'B' })).toBeNull();
  });

  it('falls to nearest-left item when the active tab is the last remaining', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/candidate-nearest-left"
        schema={buildSchema({
          path: 'ui.tabItems',
          value: [{ key: 'a', title: 'A' }],
        })}
        data={{ ui: { tabItems: [itemsABC[0]!, itemsABC[1]!] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(statusText().textContent).toBe('active=b:1'));

    fireEvent.click(screen.getByText('Mutate'));

    // b was last (index 1) → no nearest-right → nearest-left = "a"
    await waitFor(() => expect(statusText().textContent).toBe('active=a:0'));
    expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('true');
  });

  it('renders an empty shell when all items are removed', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/candidate-empty"
        schema={buildSchema({ path: 'ui.tabItems', value: [] }, 'a')}
        data={{ ui: { tabItems: [itemsABC[0]!] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(statusText().textContent).toBe('active=a:0'));

    fireEvent.click(screen.getByText('Mutate'));

    // items empty → no candidate; no trigger/panel renders (empty shell, §10 step 4)
    await waitFor(() => {
      expect(document.querySelectorAll('[data-slot="tabs-trigger"]')).toHaveLength(0);
      expect(document.querySelectorAll('[data-slot="tabs-content"]')).toHaveLength(0);
    });
  });

  it('controlled ownership does NOT auto-correct a stale bound value', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/candidate-controlled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              valueOwnership: 'controlled',
              value: '${ui.active}',
              statusPath: 'ui.tabsStatus',
              items: '${ui.tabItems}',
            },
            {
              type: 'button',
              label: 'Mutate',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'ui.tabItems',
                  value: [
                    { key: 'a', title: 'A' },
                    { key: 'c', title: 'C' },
                  ],
                },
              },
            },
            {
              type: 'text',
              text: 'active=${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}',
            },
          ],
        }}
        data={{ ui: { active: 'b', tabItems: itemsABC } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(statusText().textContent).toBe('active=b:1'));

    fireEvent.click(screen.getByText('Mutate'));

    // controlled: the bound expr is the single source of truth. candidate-fix
    // must not rewrite it; the value stays "b" (stale) until the binding changes.
    await waitFor(() => expect(statusText().textContent).toBe('active=b:0'));
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEffect, useState } from 'react';
import type {
  BaseSchema,
  InstanceFrame,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { useRenderInstancePath } from '@nop-chaos/flux-react';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

const records = Array.from({ length: 15 }, (_, index) => ({
  id: `r${index + 1}`,
  name: `Name-${index + 1}`,
  status: index % 2 === 0 ? 'active' : 'draft',
}));

function StubCardItemView(props: {
  owner: RendererComponentProps;
  item: unknown;
  index: number;
  itemKey: string;
  parentInstancePath: readonly InstanceFrame[] | undefined;
}) {
  const { owner, item, index, itemKey, parentInstancePath } = props;
  const helpers = owner.helpers;
  const [itemScope] = useState<ScopeRef>(() => helpers.createScope({ item, index }));

  useEffect(() => {
    itemScope.merge({ item, index });
  }, [itemScope, item, index]);

  useEffect(() => {
    return () => {
      helpers.disposeScope(itemScope.id);
    };
  }, [helpers, itemScope.id]);

  const instancePath: InstanceFrame[] = [
    ...(parentInstancePath ?? []),
    { repeatedTemplateId: `stub-cards:${owner.id}`, instanceKey: itemKey },
  ];

  const content = owner.regions.card
    ? (owner.regions.card.render({
        scope: itemScope,
        bindings: { item, index },
        instancePath,
      }) as React.ReactNode)
    : null;

  return (
    <div data-slot="cards-item" data-item-key={itemKey}>
      {content}
    </div>
  );
}

/**
 * Stand-in for the real `cards` renderer (which lives in `@nop-chaos/flux-renderers-content`,
 * a sibling package this package cannot depend on). It mirrors the real renderer's per-item
 * region instantiation so the CRUD integration (schema derivation, scope-path items,
 * `selectionStatePath` wiring) can be exercised end-to-end within this package's test runtime.
 */
function StubCardsRenderer(props: RendererComponentProps) {
  const items = Array.isArray(props.props.items) ? props.props.items : [];
  const keyField = typeof props.props.keyField === 'string' ? props.props.keyField : 'id';
  const parentInstancePath = useRenderInstancePath();

  return (
    <div
      data-testid="stub-cards"
      data-slot="cards-root"
      data-selection-mode={String(props.props.selectionMode ?? 'none')}
      data-items-count={items.length}
    >
      {items.map((item, index) => {
        const record = item as Record<string, unknown> | null;
        const rawKey = record ? record[keyField] : undefined;
        const key = rawKey !== undefined && rawKey !== null && rawKey !== '' ? String(rawKey) : `card:${index}`;
        return (
          <StubCardItemView
            key={key}
            owner={props}
            item={item}
            index={index}
            itemKey={key}
            parentInstancePath={parentInstancePath}
          />
        );
      })}
    </div>
  );
}

const stubCardsRenderer: RendererDefinition = {
  type: 'cards',
  component: StubCardsRenderer,
  fields: [{ key: 'card', kind: 'region', params: ['item', 'index'], isolate: false }],
};

function renderCrud(schema: BaseSchema, extra: RendererDefinition[] = []) {
  const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, ...extra]);
  return render(
    <SchemaRenderer
      schemaUrl="test://data/crud-list-mode"
      schema={{ type: 'page', body: [schema] }}
      data={{ records }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function listPaginationFooter() {
  return document.querySelector('[data-slot="crud-list-pagination"]') as HTMLElement | null;
}

describe('CRUD listMode carrier selection', () => {
  it('table mode (default) renders the internal table carrier with zero regression', async () => {
    renderCrud({
      type: 'crud',
      id: 'table-crud',
      source: '${records}',
      rowKey: 'id',
      columns: [{ name: 'name', label: 'Name' }],
    });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="crud-table"]')).not.toBeNull();
    });
    expect(document.querySelector('[data-slot="crud-list-body"]')).toBeNull();
    expect(screen.getByText('Name-1')).toBeTruthy();
  });

  it('list mode renders the list carrier, drives pagination through CRUD scope state, and keeps carrier selectionMode off', async () => {
    renderCrud({
      type: 'crud',
      id: 'list-crud',
      listMode: 'list',
      source: '${records}',
      rowKey: 'id',
      item: [{ type: 'text', text: '${$slot.item.name}' }],
      columns: [{ name: 'name', label: 'Name' }],
    });

    await waitFor(() => {
      expect(screen.getByText('Name-1')).toBeTruthy();
    });

    const body = document.querySelector('[data-slot="crud-list-body"]');
    expect(body).not.toBeNull();
    expect(body?.getAttribute('data-list-mode')).toBe('list');
    expect(document.querySelector('[data-slot="list-root"]')).not.toBeNull();
    expect(listPaginationFooter()).not.toBeNull();

    // Page 1 shows the first 10 records; page 2 records are not yet visible.
    expect(screen.getByText('Name-10')).toBeTruthy();
    expect(screen.queryByText('Name-11')).toBeNull();

    // Footer pagination writes to CRUD paginationStatePath; the list (scope-owned pagination) reacts.
    fireEvent.click(
      (listPaginationFooter() as HTMLElement).querySelector('[data-slot="pagination-link"]:last-of-type') as HTMLElement,
    );

    await waitFor(() => {
      expect(screen.getByText('Name-11')).toBeTruthy();
      expect(screen.queryByText('Name-1')).toBeNull();
    });
  });

  it('cards mode renders the cards carrier with CRUD pre-sliced items and selectionMode none', async () => {
    renderCrud(
      {
        type: 'crud',
        id: 'cards-crud',
        listMode: 'cards',
        source: '${records}',
        rowKey: 'id',
        card: [{ type: 'text', text: '${$slot.item.name}' }],
        columns: [{ name: 'name', label: 'Name' }],
      },
      [stubCardsRenderer],
    );

    const cardsRoot = await waitFor(() => screen.getByTestId('stub-cards'));
    expect(cardsRoot.getAttribute('data-selection-mode')).toBe('none');
    expect(cardsRoot.getAttribute('data-items-count')).toBe('10');

    const body = document.querySelector('[data-slot="crud-list-body"]');
    expect(body?.getAttribute('data-list-mode')).toBe('cards');
    expect(listPaginationFooter()).not.toBeNull();

    // Pre-sliced to page 1 (10 items); page 2 content is not present yet.
    expect(screen.getByText('Name-10')).toBeTruthy();
    expect(screen.queryByText('Name-11')).toBeNull();

    // Advancing pagination causes CRUD to re-slice carrierRows to the second page (5 items).
    fireEvent.click(
      (listPaginationFooter() as HTMLElement).querySelector('[data-slot="pagination-link"]:last-of-type') as HTMLElement,
    );

    await waitFor(() => {
      expect(screen.getByTestId('stub-cards').getAttribute('data-items-count')).toBe('5');
      expect(screen.getByText('Name-11')).toBeTruthy();
    });
  });

  it('selection reads/writes the same selectionStatePath in list mode (CRUD self-held via toggleSelection)', async () => {
    renderCrud({
      type: 'crud',
      id: 'sel-list-crud',
      listMode: 'list',
      source: '${records}',
      rowKey: 'id',
      selection: {},
      selectionStatePath: '$sel',
      item: [
        {
          type: 'button',
          label: '${ARRAYINCLUDES($sel, $slot.item.id) ? "Selected" : "Select"}',
          onClick: {
            action: 'component:toggleSelection',
            componentId: 'sel-list-crud',
            args: { key: '${$slot.item.id}' },
          },
        },
      ],
      footerToolbar: [{ type: 'text', text: 'Count: ${$crud.selectionCount}' }],
      columns: [{ name: 'name', label: 'Name' }],
    });

    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });

    const selectButton = screen.getAllByRole('button', { name: 'Select' })[0];
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('Count: 1')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'Selected' }).length).toBeGreaterThan(0);
    });

    // Toggling again removes the key from the same selectionStatePath.
    fireEvent.click(screen.getAllByRole('button', { name: 'Selected' })[0]);
    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'Select' }).length).toBeGreaterThan(0);
    });
  });

  it('selection reads/writes the same selectionStatePath in cards mode (CRUD self-held via toggleSelection)', async () => {
    renderCrud(
      {
        type: 'crud',
        id: 'sel-cards-crud',
        listMode: 'cards',
        source: '${records}',
        rowKey: 'id',
        selection: {},
        selectionStatePath: '$sel',
        card: [
          {
            type: 'button',
            label: '${ARRAYINCLUDES($sel, $slot.item.id) ? "Selected" : "Pick"}',
            onClick: {
              action: 'component:toggleSelection',
              componentId: 'sel-cards-crud',
              args: { key: '${$slot.item.id}' },
            },
          },
        ],
        footerToolbar: [{ type: 'text', text: 'Count: ${$crud.selectionCount}' }],
        columns: [{ name: 'name', label: 'Name' }],
      },
      [stubCardsRenderer],
    );

    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Pick' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Count: 1')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'Selected' }).length).toBeGreaterThan(0);
    });
  });

  it('table mode selection shares the same selectionStatePath as non-table modes', async () => {
    renderCrud({
      type: 'crud',
      id: 'sel-table-crud',
      source: '${records}',
      rowKey: 'id',
      selection: {},
      footerToolbar: [{ type: 'text', text: 'Count: ${$crud.selectionCount}' }],
      columns: [{ name: 'name', label: 'Name' }],
    });

    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Count: 1')).toBeTruthy();
    });
  });

  it('AUDIT-02: cards carrier does not remount on selection change (compile-once, no keyed remount)', async () => {
    renderCrud(
      {
        type: 'crud',
        id: 'audit02-cards-crud',
        listMode: 'cards',
        source: '${records}',
        rowKey: 'id',
        selection: {},
        selectionStatePath: '$sel',
        card: [
          {
            type: 'button',
            label: '${ARRAYINCLUDES($sel, $slot.item.id) ? "Picked" : "Pick"}',
            onClick: {
              action: 'component:toggleSelection',
              componentId: 'audit02-cards-crud',
              args: { key: '${$slot.item.id}' },
            },
          },
        ],
        footerToolbar: [{ type: 'text', text: 'Count: ${$crud.selectionCount}' }],
        columns: [{ name: 'name', label: 'Name' }],
      },
      [stubCardsRenderer],
    );

    const cardsRootBefore = await waitFor(() => screen.getByTestId('stub-cards'));

    fireEvent.click(screen.getAllByRole('button', { name: 'Pick' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Count: 1')).toBeTruthy();
    });

    // Selection changed but the carrier was NOT remounted — the same root element is
    // still mounted, proving the item/card template is compiled once and updated
    // reactively (the old keyed-remount workaround would have created a new node).
    expect(screen.getByTestId('stub-cards')).toBe(cardsRootBefore);
  });
});

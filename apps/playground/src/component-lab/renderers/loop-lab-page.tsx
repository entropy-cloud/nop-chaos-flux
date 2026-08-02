import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import type { RendererEnv } from '@nop-chaos/flux-core';

/**
 * Real-browser composite host scenario (C1.2 Phase 3, bug 73 / row-pollution
 * pattern): loop rows each host an Edit button that opens a dialog. The dialog
 * title and the submitAction args are evaluated in the ROW scope ($slot.row),
 * and the probe fetcher records the payload to `window.__loopRowEditProbe`.
 * The e2e asserts each row's submit carries ITS OWN rowId + typed value —
 * proving nested action args do not leak across loop rows.
 */
const loopRowEditFetcher = (async (api: { url?: string; data?: unknown }) => {
  const url = api.url ?? '';
  if (url.includes('Row__save')) {
    (window as unknown as { __loopRowEditProbe?: unknown }).__loopRowEditProbe = api.data;
    return { ok: true, status: 200, data: api.data };
  }
  return { ok: true, status: 200, data: null };
}) as unknown as RendererEnv['fetcher'];

const loopRowEdit = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${rows}',
      itemName: 'row',
      keyBy: 'item.id',
      body: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          justify: 'between',
          className: 'border rounded-lg p-3 mb-2',
          body: [
            { type: 'text', text: '${$slot.row.name}' },
            {
              type: 'button',
              label: 'Edit',
              size: 'xs',
              variant: 'outline',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Edit ${$slot.row.name}',
                  body: {
                    type: 'form',
                    name: 'rowEditForm',
                    submitScope: 'surface',
                    submitAction: {
                      action: 'ajax',
                      args: {
                        url: '/r/Row__save',
                        method: 'post',
                        data: {
                          rowId: '${$slot.row.id}',
                          rowName: '${$slot.row.name}',
                          nick: '${nick}',
                        },
                      },
                    },
                    onSubmitSuccess: [{ action: 'closeSurface' }],
                    body: [{ type: 'input-text', name: 'nick', label: 'Nick' }],
                    actions: [
                      {
                        type: 'button',
                        label: 'Save',
                        level: 'primary',
                        onClick: {
                          action: 'submitForm',
                          then: { action: 'closeSurface' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

const userLoop = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${items}',
      itemName: 'item',
      indexName: 'idx',
      body: [{ type: 'text', text: '${$slot.idx + 1}. ${$slot.item.name} — ${$slot.item.role}' }],
    },
  ],
};

const productLoop = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${products}',
      itemName: 'product',
      indexName: 'i',
      body: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          justify: 'between',
          className: 'border rounded-lg p-3 mb-2',
          body: [
            {
              type: 'flex',
              direction: 'row',
              align: 'center',
              gap: 2,
              body: [
                { type: 'icon', icon: 'package', size: 16 },
                { type: 'text', text: '${$slot.product.name}' },
              ],
            },
            {
              type: 'flex',
              direction: 'row',
              gap: 2,
              body: [
                { type: 'badge', text: '${$slot.product.category}', level: 'info' },
                { type: 'text', text: '$${$slot.product.price}' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function LoopLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Iterates over an array and renders each item via a body region. Exposes itemName, indexName, and keyName bindings into each item's scope."
      scenarios={[
        {
          title: 'Loop over a user list',
          description: 'Each item is rendered as a text line using the item and index bindings.',
          schema: userLoop,
          data: {
            items: [
              { name: 'Alice', role: 'Admin' },
              { name: 'Bob', role: 'Editor' },
              { name: 'Carol', role: 'Viewer' },
            ],
          },
        },
        {
          title: 'Loop over products — card row with icon, badge, and price',
          description:
            'Each product renders as a flex row with an icon, name, category badge, and price. Demonstrates rich per-item templates.',
          schema: productLoop,
          data: {
            products: [
              { name: 'Wireless Headphones', category: 'Electronics', price: 89.99 },
              { name: 'Ergonomic Chair', category: 'Furniture', price: 349.0 },
              { name: 'Mechanical Keyboard', category: 'Electronics', price: 129.5 },
              { name: 'Standing Desk', category: 'Furniture', price: 499.0 },
            ],
          },
        },
        {
          title: 'Loop rows edit through a dialog (row-scope submit)',
          description:
            'Each row hosts an Edit button that opens a dialog. The dialog title and submit payload are evaluated in the row scope — C1.2 bug 73/row-pollution pattern host check.',
          schema: loopRowEdit,
          env: { fetcher: loopRowEditFetcher },
          data: {
            rows: [
              { id: 'row-a', name: 'Alice' },
              { id: 'row-b', name: 'Bob' },
            ],
          },
        },
      ]}
    />
  );
}

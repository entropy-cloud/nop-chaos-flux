import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ComponentCapabilityActionContext, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SchemaRenderer = createDataSchemaRenderer();

afterEach(() => {
  cleanup();
});

function itemNodes(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-slot="list-item"]'));
}

function itemKeys(): (string | null)[] {
  return itemNodes().map((node) => node.getAttribute('data-item-key'));
}

function itemLabels(): (string | undefined)[] {
  return itemNodes().map((node) => node.textContent?.trim());
}

// Four items WITHOUT an `id` field so the fallback-key path (`item:<index>`) is
// exercised — this is the path that collides across pages before the fix.
const fourItems = Array.from({ length: 4 }, (_, index) => ({ label: `Row ${index}` }));

describe('list cross-page key uniqueness (P0-4)', () => {
  it('fallback keys are globally unique across pages; selection does not bleed across pages', async () => {
    const registryRef: { current: ComponentHandleRegistry | undefined } = { current: undefined };

    render(
      <SchemaRenderer
        schemaUrl="test://list/cross-page-key"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              id: 'list-cap',
              items: fourItems,
              selectionMode: 'multiple',
              pagination: { enabled: true, pageSize: 2, total: 4 },
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onComponentRegistryChange={(registry) => {
          registryRef.current = registry ?? undefined;
        }}
      />,
    );

    await waitFor(() => expect(itemLabels()).toEqual(['Row 0', 'Row 1']));

    // Page 1 fallback keys are the GLOBAL indices, not the per-window positions.
    expect(itemKeys()).toEqual(['item:0', 'item:1']);

    // Select the first row on page 1.
    fireEvent.click(itemNodes()[0]);
    await waitFor(() => expect(itemNodes()[0].getAttribute('data-selected')).toBe('true'));

    await waitFor(() =>
      expect(
        registryRef.current?.resolve({ componentId: 'list-cap' })?.capabilities,
      ).toBeTruthy(),
    );

    const resolveListHandle = () => registryRef.current!.resolve({ componentId: 'list-cap' })!;

    await act(async () => {
      await resolveListHandle().capabilities.invoke(
        'gotoPage',
        { page: 2 },
        {} as ComponentCapabilityActionContext,
      );
    });

    await waitFor(() => expect(itemLabels()).toEqual(['Row 2', 'Row 3']));

    // Page 2 keys are GLOBAL indices (item:2, item:3), never a reuse of item:0/item:1.
    expect(itemKeys()).toEqual(['item:2', 'item:3']);

    // No selection bleed: page 2's first row occupies window index 0, which
    // previously collided with page 1's selected row 0. It must NOT be selected.
    expect(itemNodes()[0].getAttribute('data-selected')).toBeNull();

    // Selection survives a round-trip back to page 1 (per-key state is isolated).
    await act(async () => {
      await resolveListHandle().capabilities.invoke(
        'gotoPage',
        { page: 1 },
        {} as ComponentCapabilityActionContext,
      );
    });
    await waitFor(() => expect(itemLabels()).toEqual(['Row 0', 'Row 1']));
    expect(itemNodes()[0].getAttribute('data-selected')).toBe('true');
  });
});

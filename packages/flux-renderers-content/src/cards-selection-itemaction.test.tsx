
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererComponentProps, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer, useCurrentActionScope } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

// Captures the evaluated `value` arg of a `capture:record` namespaced action into the DOM.
// Namespaced action args are evaluated against the dispatch scope (per-row itemScope for
// cards onItemClick), so the captured value proves which row's scope the action ran in.
function CaptureProvider(props: RendererComponentProps) {
  const actionScope = useCurrentActionScope();
  const [captured, setCaptured] = React.useState('');
  React.useEffect(() => {
    if (!actionScope) return;
    return actionScope.registerNamespace('capture', {
      kind: 'host',
      invoke(_method, payload) {
        setCaptured(String((payload as { value?: unknown } | undefined)?.value ?? ''));
        return { ok: true, data: (payload as { value?: unknown } | undefined)?.value };
      },
    });
  }, [actionScope]);
  return (
    <span data-testid="capture-result" data-provider={String(props.props.label ?? 'capture')}>
      {captured}
    </span>
  );
}

const captureProviderRenderer: RendererDefinition = {
  type: 'capture-provider',
  component: CaptureProvider,
};

function createCardsSchemaRenderer() {
  return createSchemaRenderer([
    pageRenderer,
    textRenderer,
    captureProviderRenderer,
    ...contentRendererDefinitions,
  ]);
}

const formulaCompiler = createFormulaCompiler();

const rows = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

describe('CD1: selectionMode none disables BOTH visual highlight and selection state', () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });
  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
  });

  it('selectionMode "none" → clicking a card sets no data-selected and does not fire onSelectionChange', () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cd1-none"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              selectionMode: 'none',
              items: '${rows}',
              onSelectionChange: {
                action: 'setValue',
                args: { path: 'selReported', value: true },
              },
              card: { type: 'text', text: '${$slot.item.label}' },
            },
            { type: 'text', text: 'sel:${selReported ? "reported" : "pending"}' },
          ],
        }}
        data={{ rows }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const cards = document.querySelectorAll('[data-slot="cards-item"]');
    expect(cards.length).toBe(3);

    fireEvent.click(cards[1] as HTMLElement);

    // No card becomes selected (visual highlight off)...
    expect(cards[0].getAttribute('data-selected')).toBeNull();
    expect(cards[1].getAttribute('data-selected')).toBeNull();
    expect(cards[2].getAttribute('data-selected')).toBeNull();
    // ...and selection state is never reported (no partial disable — off disables both).
    expect(screen.getByText('sel:pending')).toBeTruthy();
  });

  it('default selectionMode (unset) behaves identically to "none" (no highlight, no selection)', () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cd1-default"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              items: '${rows}',
              onSelectionChange: {
                action: 'setValue',
                args: { path: 'selReported', value: true },
              },
              card: { type: 'text', text: '${$slot.item.label}' },
            },
            { type: 'text', text: 'sel:${selReported ? "reported" : "pending"}' },
          ],
        }}
        data={{ rows }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const cards = document.querySelectorAll('[data-slot="cards-item"]');
    fireEvent.click(cards[0] as HTMLElement);

    expect(cards[0].getAttribute('data-selected')).toBeNull();
    expect(screen.getByText('sel:pending')).toBeTruthy();
  });

  it('with onItemClick bound (no selection), cards are interactive (click handler) but still show no selection highlight', async () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cd1-interactive"
        schema={{
          type: 'page',
          body: [
            { type: 'capture-provider', label: 'cards-click' },
            {
              type: 'cards',
              items: '${rows}',
              onItemClick: { action: 'capture:record', args: { value: 'click' } },
              card: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const cards = document.querySelectorAll('[data-slot="cards-item"]');
    // interactive => cursor-pointer present and focusable (tabindex 0)
    expect(cards[0].className).toContain('cursor-pointer');
    expect(cards[0].getAttribute('tabindex')).toBe('0');

    fireEvent.click(cards[1] as HTMLElement);
    // click fired the event...
    await waitFor(() => {
      expect(screen.getByTestId('capture-result').textContent).toBe('click');
    });
    // ...but no selection visual (off disables highlight regardless of interactivity)
    expect(cards[1].getAttribute('data-selected')).toBeNull();
  });

  it('without onItemClick and selectionMode none, cards are NOT interactive (no click handler / no cursor)', () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cd1-not-interactive"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              selectionMode: 'none',
              items: '${rows}',
              card: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const cards = document.querySelectorAll('[data-slot="cards-item"]');
    expect(cards[0].className).not.toContain('cursor-pointer');
    expect(cards[0].getAttribute('tabindex')).toBeNull();
    expect(cards[0].getAttribute('aria-selected')).toBeNull();
  });
});

describe('CD4: onItemClick action evaluates against the per-row itemScope', () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });
  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
  });

  it('onItemClick reads ${item.label} and resolves to the CLICKED row (not root, not another row)', async () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cd4-row-scope"
        schema={{
          type: 'page',
          body: [
            { type: 'capture-provider', label: 'cards-itemaction' },
            {
              type: 'cards',
              items: '${rows}',
              onItemClick: {
                action: 'capture:record',
                args: { value: '${item.label}' },
              },
              card: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{ rows }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const cards = document.querySelectorAll('[data-slot="cards-item"]');
    expect(cards.length).toBe(3);

    // Click the SECOND card (Beta). The action must evaluate against that card's itemScope.
    fireEvent.click(cards[1] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByTestId('capture-result').textContent).toBe('Beta');
    });

    // Click the THIRD card (Gamma) — proves each row carries a distinct evaluation scope.
    fireEvent.click(cards[2] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByTestId('capture-result').textContent).toBe('Gamma');
    });
  });
});

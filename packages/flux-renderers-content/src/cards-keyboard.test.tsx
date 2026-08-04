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

// Counts every `capture:record` namespace invoke — proves how many times an
// item action was dispatched from one keyboard activation.
function CaptureCounter(props: RendererComponentProps) {
  const actionScope = useCurrentActionScope();
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!actionScope) return;
    return actionScope.registerNamespace('capture', {
      kind: 'host',
      invoke(_method, payload) {
        const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
        setCount((prev) => prev + 1);
        return { ok: true, data: value };
      },
    });
  }, [actionScope]);
  return (
    <span data-testid="capture-count" data-captured={String(props.props.label ?? '')}>
      {count}
    </span>
  );
}

const captureCounterRenderer: RendererDefinition = {
  type: 'capture-counter',
  component: CaptureCounter,
};

function createCardsSchemaRenderer() {
  return createSchemaRenderer([
    pageRenderer,
    textRenderer,
    captureCounterRenderer,
    ...contentRendererDefinitions,
  ]);
}

const formulaCompiler = createFormulaCompiler();

const rows = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];

describe('cards keyboard activation (Enter/Space) dispatches ONCE (P1-1 regression)', () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });
  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
  });

  it('Enter selects a single-mode card exactly once (no double-toggle → stays selected)', () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/keyboard-single-enter"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              selectionMode: 'single',
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
    fireEvent.keyDown(cards[1] as HTMLElement, { key: 'Enter' });

    // The keyboard path must produce the SAME single select-toggle as a click:
    // select → stay selected (double-fire would deselect it again).
    expect(cards[1].getAttribute('data-selected')).toBe('true');
    expect(cards[0].getAttribute('data-selected')).toBeNull();
  });

  it('Enter dispatches onItemClick exactly once (no duplicate action dispatch)', async () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/keyboard-itemclick-once"
        schema={{
          type: 'page',
          body: [
            { type: 'capture-counter', label: 'cards-keyboard' },
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
    fireEvent.keyDown(cards[0] as HTMLElement, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByTestId('capture-count').textContent).toBe('1');
    });
  });

  it('Space selects a multiple-mode card and dispatches onItemClick exactly once', async () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/keyboard-space"
        schema={{
          type: 'page',
          body: [
            { type: 'capture-counter', label: 'cards-space' },
            {
              type: 'cards',
              selectionMode: 'multiple',
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
    fireEvent.keyDown(cards[0] as HTMLElement, { key: ' ' });

    await waitFor(() => {
      expect(screen.getByTestId('capture-count').textContent).toBe('1');
    });
    expect(cards[0].getAttribute('data-selected')).toBe('true');
  });

  it('Enter toggles a selected single-mode card OFF exactly once (no net no-op)', () => {
    const SchemaRenderer = createCardsSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/keyboard-single-toggle-off"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              selectionMode: 'single',
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
    // select via click first
    fireEvent.click(cards[0] as HTMLElement);
    expect(cards[0].getAttribute('data-selected')).toBe('true');

    // Enter on the selected card → exactly one toggle OFF (double-toggle would
    // toggle OFF then ON again, leaving it selected)
    fireEvent.keyDown(cards[0] as HTMLElement, { key: 'Enter' });
    expect(cards[0].getAttribute('data-selected')).toBeNull();
  });
});

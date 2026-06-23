// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

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

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, textRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

describe('CardsRenderer (W2a — content package card collection)', () => {
  afterEach(() => {
    cleanup();
  });

  it('instantiates the card region once per collection entry with per-card scope (item/index)', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cards-render"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              items: '${rows}',
              card: {
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

    expect(screen.getByText('Alpha:0')).toBeTruthy();
    expect(screen.getByText('Beta:1')).toBeTruthy();
    expect(screen.getByText('Gamma:2')).toBeTruthy();

    const root = document.querySelector('.nop-cards') as HTMLElement;
    expect(root).toBeTruthy();
    const cards = root.querySelectorAll('[data-slot="cards-item"]');
    expect(cards.length).toBe(3);
  });

  it('renders the empty region when items is an empty array', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cards-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              items: '${rows}',
              empty: { type: 'text', text: 'No cards' },
            },
          ],
        }}
        data={{ rows: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('No cards')).toBeTruthy();
    const root = document.querySelector('.nop-cards') as HTMLElement;
    expect(root.getAttribute('data-empty')).toBe('true');
    expect(root.querySelector('[data-slot="cards-empty"]')?.textContent).toContain('No cards');
    expect(root.querySelectorAll('[data-slot="cards-item"]').length).toBe(0);
  });

  it('renders the empty state when items resolves to null/undefined (single items field, no crash)', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cards-null"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              empty: { type: 'text', text: 'No cards loaded' },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('No cards loaded')).toBeTruthy();
  });

  it('applies single-selection mutual exclusion and reports selection change', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cards-single"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              selectionMode: 'single',
              items: '${rows}',
              onSelectionChange: {
                action: 'setValue',
                args: { path: 'selectionReported', value: true },
              },
              card: { type: 'text', text: '${$slot.item.label}' },
            },
            {
              type: 'text',
              text: 'sel:${selectionReported ? "reported" : "pending"}',
            },
          ],
        }}
        data={{ rows: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Alpha')).toBeTruthy();
    const cards = document.querySelectorAll('[data-slot="cards-item"]');

    fireEvent.click(cards[0] as HTMLElement);
    expect(cards[0].getAttribute('data-selected')).toBe('true');
    expect(cards[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('sel:reported')).toBeTruthy();

    fireEvent.click(cards[1] as HTMLElement);
    expect(cards[1].getAttribute('data-selected')).toBe('true');
    expect(cards[0].getAttribute('data-selected')).toBeNull();
  });

  it('accumulates multiple-selection highlight across cards', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/cards-multiple"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              selectionMode: 'multiple',
              items: '${rows}',
              card: { type: 'text', text: '${$slot.item.label}' },
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

    const cards = document.querySelectorAll('[data-slot="cards-item"]');
    fireEvent.click(cards[0] as HTMLElement);
    fireEvent.click(cards[2] as HTMLElement);

    expect(cards[0].getAttribute('data-selected')).toBe('true');
    expect(cards[2].getAttribute('data-selected')).toBe('true');
    expect(cards[1].getAttribute('data-selected')).toBeNull();
    expect(
      document.querySelectorAll('[data-slot="cards-item"][data-selected="true"]').length,
    ).toBe(2);
  });

  it('does NOT declare a second collection field (single items field principle)', () => {
    // Closure gate: cards must have a SINGLE items collection field (no double-track
    // template protocol). Grep the renderer + schema source for any second collection-like field.
    const renderer = readFileSync('src/cards-renderer.tsx', 'utf8');
    const schemas = readFileSync('src/schemas.ts', 'utf8');
    const cardsSchemaBlock = schemas.slice(
      schemas.indexOf('export interface CardsSchema'),
      schemas.indexOf('export type AlertLevel'),
    );
    // No `source`/`data`/`records`/`value` collection-like fields on CardsSchema (only items).
    expect(cardsSchemaBlock).not.toMatch(/\brecords\s*[?:]/);
    expect(cardsSchemaBlock).not.toMatch(/\bdata\s*[?:]/);
    expect(cardsSchemaBlock).not.toMatch(/^\s*source\s*[?:]/m);
    // Renderer source must iterate a single items-derived array.
    expect(renderer).toMatch(/toCardsItems/);
  });
});

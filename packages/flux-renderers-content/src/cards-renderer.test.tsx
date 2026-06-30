import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
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

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, textRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

describe('CardsRenderer (W2a — content package card collection)', () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });

  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
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

  it('does NOT advertise dead selection/pagination contracts (advertised-but-dead honesty)', () => {
    // F2 remediation: selectionOwnership / selectionStatePath / onPageChange were advertised
    // in the schema/definition but the renderer never read them (selection is local useState,
    // there is no pagination logic). They must be removed from the contract surface.
    const renderer = readFileSync('src/cards-renderer.tsx', 'utf8');
    const schemas = readFileSync('src/schemas.ts', 'utf8');
    const definitions = readFileSync('src/content-renderer-definitions.ts', 'utf8');

    const cardsSchemaBlock = schemas.slice(
      schemas.indexOf('export interface CardsSchema'),
      schemas.indexOf('export type AlertLevel'),
    );
    const cardsDefinitionBlock = definitions.slice(
      definitions.indexOf("type: 'cards'"),
      definitions.indexOf("type: 'alert'"),
    );

    // Dead fields removed from the schema interface.
    expect(cardsSchemaBlock).not.toMatch(/selectionOwnership/);
    expect(cardsSchemaBlock).not.toMatch(/selectionStatePath/);
    expect(cardsSchemaBlock).not.toMatch(/onPageChange/);
    // Dead fields/events removed from the renderer definition.
    expect(cardsDefinitionBlock).not.toMatch(/selectionOwnership/);
    expect(cardsDefinitionBlock).not.toMatch(/selectionStatePath/);
    expect(cardsDefinitionBlock).not.toMatch(/onPageChange/);
    // Renderer body references none of the dead names.
    expect(renderer).not.toMatch(/selectionOwnership/);
    expect(renderer).not.toMatch(/selectionStatePath/);
    expect(renderer).not.toMatch(/onPageChange/);
    // The IMPLEMENTED selection contract (selectionMode + onSelectionChange) remains.
    expect(cardsSchemaBlock).toMatch(/selectionMode/);
    expect(cardsDefinitionBlock).toMatch(/onSelectionChange/);
  });
});

describe('CardsRenderer responsive — schema-driven columns (successor)', () => {
  const SchemaRenderer = createContentSchemaRenderer();

  beforeEach(() => {
    mobileState.isMobile = false;
  });

  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
  });

  function renderCards(columns: number | { sm?: number; md?: number; lg?: number } | undefined) {
    return render(
      <SchemaRenderer
        schemaUrl="test://content/cards-columns"
        schema={{
          type: 'page',
          body: [
            {
              type: 'cards',
              columns,
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
  }

  it('keeps the default Tailwind column classes when columns is unset (zero regression)', () => {
    renderCards(undefined);
    const root = document.querySelector('.nop-cards') as HTMLElement;
    expect(root.className).toContain('sm:grid-cols-2');
    expect(root.className).toContain('lg:grid-cols-3');
    expect(root.style.gridTemplateColumns).toBe('');
    expect(root.getAttribute('data-responsive')).toBeNull();
  });

  it('derives a uniform column count from a numeric columns value across viewports', () => {
    renderCards(4);
    const root = document.querySelector('.nop-cards') as HTMLElement;
    expect(root.className).not.toContain('sm:grid-cols-2');
    expect(root.style.gridTemplateColumns).toContain('repeat(4');
    expect(root.getAttribute('data-responsive')).toBeNull();

    // Also uniform on mobile.
    mobileState.isMobile = true;
    cleanup();
    renderCards(4);
    const mobileRoot = document.querySelector('.nop-cards') as HTMLElement;
    expect(mobileRoot.style.gridTemplateColumns).toContain('repeat(4');
  });

  it('switches to the sm bucket and emits the narrow marker on mobile', () => {
    mobileState.isMobile = true;
    renderCards({ sm: 1, lg: 3 });
    const root = document.querySelector('.nop-cards') as HTMLElement;
    expect(root.style.gridTemplateColumns).toContain('repeat(1');
    expect(root.getAttribute('data-responsive')).toBe('narrow');
  });

  it('uses the lg/md desktop bucket and emits no marker on desktop', () => {
    renderCards({ sm: 1, md: 2, lg: 4 });
    const root = document.querySelector('.nop-cards') as HTMLElement;
    expect(root.style.gridTemplateColumns).toContain('repeat(4');
    expect(root.getAttribute('data-responsive')).toBeNull();
  });

  it('falls back to the documented defaults when breakpoint values are unset', () => {
    // Only sm set → desktop defaults to 3.
    renderCards({ sm: 2 });
    const root = document.querySelector('.nop-cards') as HTMLElement;
    expect(root.style.gridTemplateColumns).toContain('repeat(3');
    expect(root.getAttribute('data-responsive')).toBeNull();

    // Only lg set → mobile defaults to 1 and emits the narrow marker.
    mobileState.isMobile = true;
    cleanup();
    renderCards({ lg: 4 });
    const mobileRoot = document.querySelector('.nop-cards') as HTMLElement;
    expect(mobileRoot.style.gridTemplateColumns).toContain('repeat(1');
    expect(mobileRoot.getAttribute('data-responsive')).toBe('narrow');
  });
});

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition, RendererEnv, SchemaValue } from '@nop-chaos/flux-core';
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

function renderMapping(body: SchemaValue, schemaUrl: string) {
  const SchemaRenderer = createContentSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl={schemaUrl}
      schema={{ type: 'page', body }}
      data={{}}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('MappingRenderer (W3c — value→display-result mapping)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the nop-mapping marker with data-slot mapping-root', () => {
    const { container } = renderMapping(
      [{ type: 'mapping', testid: 'm1', value: 'a', map: { a: 'Alpha' } }],
      'test://mapping/marker',
    );
    const root = container.querySelector('[data-testid="m1"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('mapping-root');
    expect(root.className).toContain('nop-mapping');
    expect(root.getAttribute('data-state')).toBe('hit');
  });

  it('renders the hit map value as text (mapping-hit)', () => {
    const { container } = renderMapping(
      [{ type: 'mapping', testid: 'm1', value: 'active', map: { active: 'Active', idle: 'Idle' } }],
      'test://mapping/hit',
    );
    expect(container.querySelector('[data-testid="m1"] [data-slot="mapping-item"]')?.textContent).toBe(
      'Active',
    );
  });

  it('coerces numeric/boolean value keys to string for map lookup', () => {
    const { container } = renderMapping(
      [
        {
          type: 'mapping',
          testid: 'num',
          value: 1,
          map: { '1': 'One', '2': 'Two' },
        },
        {
          type: 'mapping',
          testid: 'bool',
          value: true,
          map: { true: 'Yes', false: 'No' },
        },
      ],
      'test://mapping/coerce',
    );
    expect(container.querySelector('[data-testid="num"] [data-slot="mapping-item"]')?.textContent).toBe(
      'One',
    );
    expect(
      container.querySelector('[data-testid="bool"] [data-slot="mapping-item"]')?.textContent,
    ).toBe('Yes');
  });

  it('renders defaultLabel on miss (defaultLabel precedence over placeholder)', () => {
    const { container } = renderMapping(
      [
        {
          type: 'mapping',
          testid: 'm1',
          value: 'unknown',
          map: { a: 'Alpha' },
          defaultLabel: 'Default',
          placeholder: 'Placeholder',
        },
      ],
      'test://mapping/miss-default',
    );
    const root = container.querySelector('[data-testid="m1"]') as HTMLElement;
    expect(root.getAttribute('data-state')).toBe('miss');
    expect(root.querySelector('[data-slot="mapping-item"]')?.textContent).toBe('Default');
  });

  it('renders placeholder on miss when no defaultLabel (placeholder fallback)', () => {
    const { container } = renderMapping(
      [
        {
          type: 'mapping',
          testid: 'm1',
          value: 'unknown',
          map: { a: 'Alpha' },
          placeholder: 'Placeholder',
        },
      ],
      'test://mapping/miss-placeholder',
    );
    expect(
      container.querySelector('[data-testid="m1"] [data-slot="mapping-item"]')?.textContent,
    ).toBe('Placeholder');
  });

  it('renders placeholder for empty/null/undefined value without throwing (null-value)', () => {
    const { container } = renderMapping(
      [
        { type: 'mapping', testid: 'empty', value: '', map: {}, placeholder: 'N/A' },
        { type: 'mapping', testid: 'null', value: null, map: {}, placeholder: 'N/A' },
        { type: 'mapping', testid: 'undef', map: { a: 'A' }, placeholder: 'N/A' },
      ],
      'test://mapping/empty',
    );
    expect(container.querySelector('[data-testid="empty"]')?.getAttribute('data-state')).toBe(
      'empty',
    );
    expect(
      container.querySelector('[data-testid="empty"] [data-slot="mapping-item"]')?.textContent,
    ).toBe('N/A');
    expect(container.querySelector('[data-testid="null"]')?.getAttribute('data-state')).toBe(
      'empty',
    );
    expect(container.querySelector('[data-testid="undef"]')?.getAttribute('data-state')).toBe(
      'empty',
    );
  });

  it('renders nothing inside mapping-item when miss and no placeholder/defaultLabel', () => {
    const { container } = renderMapping(
      [{ type: 'mapping', testid: 'm1', value: 'unknown', map: { a: 'Alpha' } }],
      'test://mapping/miss-empty',
    );
    expect(container.querySelector('[data-testid="m1"] [data-slot="mapping-item"]')).toBeNull();
  });

  it('renders the item region template when value hits and item region is configured', () => {
    const { container } = renderMapping(
      [
        {
          type: 'mapping',
          testid: 'm1',
          value: 'active',
          map: { active: 'Active' },
          item: [{ type: 'text', text: 'Custom hit template' }],
        },
      ],
      'test://mapping/item-region',
    );
    const item = container.querySelector('[data-testid="m1"] [data-slot="mapping-item"]');
    expect(item?.textContent).toContain('Custom hit template');
  });

  it('renders a hit value bound from an expression', () => {
    const { container } = renderMapping(
      [
        {
          type: 'mapping',
          testid: 'm1',
          value: '${status}',
          map: { done: 'Completed', doing: 'In Progress' },
        },
      ],
      'test://mapping/expression',
    );
    // Without scope data the value resolves to empty → empty state, no throw.
    expect(container.querySelector('[data-testid="m1"]')?.getAttribute('data-state')).toBe('empty');
    expect(container.querySelector('[data-testid="m1"] [data-slot="mapping-item"]')).toBeNull();
  });

  it('renders a hit value bound from an expression resolved against scope data', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://mapping/expr-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'mapping',
              testid: 'm1',
              value: '${status}',
              map: { done: 'Completed', doing: 'In Progress' },
            },
          ],
        }}
        data={{ status: 'doing' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(
      container.querySelector('[data-testid="m1"] [data-slot="mapping-item"]')?.textContent,
    ).toBe('In Progress');
    expect(container.querySelector('[data-testid="m1"]')?.getAttribute('data-state')).toBe('hit');
  });

  // B6.2 — MP2: mapping source-scope / 无 wildcard 回归锚
  describe('MP2 source-scope / no-wildcard (B6.2)', () => {
    it('shared map expression resolves to the same object per row (no per-row divergence, no wildcard)', () => {
      const SchemaRenderer = createContentSchemaRenderer();
      const { container } = render(
        <SchemaRenderer
          schemaUrl="test://mapping/mp2-shared-map"
          schema={{
            type: 'page',
            body: [
              {
                type: 'cards',
                items: '${rows}',
                card: {
                  type: 'mapping',
                  value: '${$slot.item.status}',
                  map: '${statusMap}',
                  defaultLabel: 'Unknown',
                },
              },
            ],
          }}
          data={{
            statusMap: { active: 'Active', idle: 'Idle' },
            rows: [{ status: 'active' }, { status: 'idle' }, { status: 'pending' }],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );
      const items = container.querySelectorAll('[data-slot="mapping-item"]');
      expect(items.length).toBe(3);
      // 每行按各自 row value 经共享 statusMap 解析到正确 label（无 per-row 发散）。
      expect(items[0]?.textContent).toBe('Active');
      expect(items[1]?.textContent).toBe('Idle');
      // 'pending' 不在 map 内 → miss → defaultLabel（无 wildcard 误命中）。
      expect(items[2]?.textContent).toBe('Unknown');
    });

    it('map miss never falls back to a "*" wildcard key (literal-key match only)', () => {
      const { container } = renderMapping(
        [
          {
            type: 'mapping',
            testid: 'nomatch',
            value: 'unknown',
            map: { '*': 'Star', a: 'Alpha' },
            defaultLabel: 'Default',
          },
          {
            type: 'mapping',
            testid: 'starmatch',
            value: '*',
            map: { '*': 'Star', a: 'Alpha' },
          },
        ],
        'test://mapping/mp2-no-wildcard',
      );
      // 'unknown' 不命中字面 '*' 键 → miss → defaultLabel（锁定无 wildcard fallback）。
      expect(container.querySelector('[data-testid="nomatch"]')?.getAttribute('data-state')).toBe(
        'miss',
      );
      expect(
        container.querySelector('[data-testid="nomatch"] [data-slot="mapping-item"]')?.textContent,
      ).toBe('Default');
      // value 字面等于 '*' → 命中字面 '*' 键（证明 '*' 是字面 key 而非通配）。
      expect(container.querySelector('[data-testid="starmatch"]')?.getAttribute('data-state')).toBe(
        'hit',
      );
      expect(
        container.querySelector('[data-testid="starmatch"] [data-slot="mapping-item"]')?.textContent,
      ).toBe('Star');
    });
  });
});

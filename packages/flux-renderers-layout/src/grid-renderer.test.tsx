// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function gridRoot() {
  return document.querySelector('.nop-grid') as HTMLElement;
}

describe('GridRenderer (W3a — explicit 2D grid layout)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nop-grid marker, maps columns to grid-template-columns, and renders body regions', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              testid: 'demo-grid',
              columns: 3,
              gap: 12,
              items: [
                { body: [{ type: 'text', text: 'cell-A' }] },
                { body: [{ type: 'text', text: 'cell-B' }] },
                { body: [{ type: 'text', text: 'cell-C' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = gridRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('grid-root');
    expect(root.getAttribute('data-columns')).toBe('3');
    const style = (root as HTMLElement).style;
    expect(style.gridTemplateColumns).toContain('repeat(3');
    expect(style.gap).toBe('12px');
    expect(style.display).toBe('grid');

    const items = document.querySelectorAll('[data-slot="grid-item"]');
    expect(items.length).toBe(3);
    expect(screen.getByText('cell-A')).toBeTruthy();
    expect(screen.getByText('cell-B')).toBeTruthy();
    expect(screen.getByText('cell-C')).toBeTruthy();
  });

  it('clamps colSpan to the column count (colSpan exceeding grid is normalized)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-colspan"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 2,
              items: [
                { body: [{ type: 'text', text: 'wide' }], colSpan: 99 },
                { body: [{ type: 'text', text: 'normal' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const items = document.querySelectorAll('[data-slot="grid-item"]');
    expect(items[0].getAttribute('data-col-span')).toBe('2');
    expect((items[0] as HTMLElement).style.gridColumn).toContain('span 2');
    expect(items[1].getAttribute('data-col-span')).toBeNull();
  });

  it('clamps rowSpan to at least 1 and applies inline style for spans > 1', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-rowspan"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 2,
              items: [
                { body: [{ type: 'text', text: 'tall' }], rowSpan: 3 },
                { body: [{ type: 'text', text: 'short' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const items = document.querySelectorAll('[data-slot="grid-item"]');
    expect(items[0].getAttribute('data-row-span')).toBe('3');
    expect((items[0] as HTMLElement).style.gridRow).toContain('span 3');
  });

  it('renders an empty grid (marker present, no items) without throwing', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 3,
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = gridRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('grid-root');
    expect(document.querySelectorAll('[data-slot="grid-item"]').length).toBe(0);
  });

  it('accepts string columns as raw grid-template-columns', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-string-cols"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: '1fr 2fr 1fr',
              items: [{ body: [{ type: 'text', text: 'x' }] }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect((gridRoot() as HTMLElement).style.gridTemplateColumns).toBe('1fr 2fr 1fr');
  });
});

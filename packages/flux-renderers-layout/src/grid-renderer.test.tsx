import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

function gridRoot() {
  return document.querySelector('.nop-grid') as HTMLElement;
}

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

describe('GridRenderer (W3a — explicit 2D grid layout)', () => {
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

describe('GridRenderer responsive — breakpoint column switching (successor)', () => {
  it('keeps desktop behavior byte-identical when responsiveColumns is absent (no marker, no useIsMobile effect)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-no-responsive"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 3,
              items: [{ body: [{ type: 'text', text: 'a' }] }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = gridRoot() as HTMLElement;
    expect(root.getAttribute('data-columns')).toBe('3');
    expect(root.style.gridTemplateColumns).toContain('repeat(3');
    expect(root.getAttribute('data-responsive')).toBeNull();
  });

  it('uses the lg/md desktop bucket and emits no narrow marker on desktop', () => {
    mobileState.isMobile = false;
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-responsive-desktop"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 2,
              responsiveColumns: { sm: 1, md: 2, lg: 4 },
              items: [{ body: [{ type: 'text', text: 'a' }] }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = gridRoot() as HTMLElement;
    expect(root.getAttribute('data-columns')).toBe('4');
    expect(root.style.gridTemplateColumns).toContain('repeat(4');
    expect(root.getAttribute('data-responsive')).toBeNull();
  });

  it('switches to the sm bucket and emits the narrow marker on mobile', () => {
    mobileState.isMobile = true;
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-responsive-mobile"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 3,
              responsiveColumns: { sm: 1, lg: 3 },
              items: [{ body: [{ type: 'text', text: 'a' }] }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = gridRoot() as HTMLElement;
    expect(root.getAttribute('data-columns')).toBe('1');
    expect(root.style.gridTemplateColumns).toContain('repeat(1');
    expect(root.getAttribute('data-responsive')).toBe('narrow');
  });

  it('falls back to base columns when a breakpoint value is unset', () => {
    mobileState.isMobile = true;
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-responsive-fallback"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 3,
              responsiveColumns: { lg: 4 },
              items: [{ body: [{ type: 'text', text: 'a' }] }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = gridRoot() as HTMLElement;
    expect(root.getAttribute('data-columns')).toBe('3');
    expect(root.style.gridTemplateColumns).toContain('repeat(3');
    expect(root.getAttribute('data-responsive')).toBe('narrow');
  });

  it('clamps colSpan against the effective (mobile) column count', () => {
    mobileState.isMobile = true;
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/grid-responsive-colspan"
        schema={{
          type: 'page',
          body: [
            {
              type: 'grid',
              columns: 4,
              responsiveColumns: { sm: 2 },
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
    // Mobile effective count is 2 (sm), so colSpan 99 clamps to 2 — not the base 4.
    expect(items[0]!.getAttribute('data-col-span')).toBe('2');
    expect((items[0] as HTMLElement).style.gridColumn).toContain('span 2');
  });
});

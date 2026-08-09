import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDashboardSchemaRenderer, env, formulaCompiler } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseSchema = {
  type: 'page' as const,
  body: [
    {
      type: 'dashboard',
      testid: 'demo-dashboard',
      panels: [
        { id: 'p1', type: 'panel-content', x: 0, y: 0, w: 6, h: 2, props: { text: 'KPI' } },
        { id: 'p2', type: 'panel-content', x: 6, y: 0, w: 6, h: 2, props: { text: 'Chart' } },
      ],
    },
  ],
};

describe('DashboardRenderer runtime layout', () => {
  it('renders panels at absolute grid positions with shared coordinate math', () => {
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-basic"
        schema={baseSchema}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const root = document.querySelector('.nop-dashboard') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-panel-count')).toBe('2');
    const panels = root.querySelectorAll('[data-slot="dashboard-panel"]');
    expect(panels).toHaveLength(2);
    expect(screen.getAllByTestId('panel-content')).toHaveLength(2);
    const p1 = panels[0] as HTMLElement;
    expect(p1.getAttribute('data-panel-id')).toBe('p1');
    expect(p1.style.position).toBe('absolute');
    expect(p1.style.width).not.toBe('0px');
    expect(p1.getAttribute('data-panel-type')).toBe('panel-content');
  });

  it('evaluates panel props expressions against the render scope', () => {
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-expr"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard',
              panels: [
                {
                  id: 'p1',
                  type: 'panel-content',
                  x: 0,
                  y: 0,
                  w: 4,
                  h: 2,
                  props: { text: '${greeting}' },
                },
              ],
            },
          ],
        }}
        data={{ greeting: 'hello-flux' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('hello-flux')).toBeTruthy();
  });

  it('injects the evaluated source expression as the panel data prop', () => {
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-source"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard',
              panels: [
                {
                  id: 'p1',
                  type: 'panel-content',
                  x: 0,
                  y: 0,
                  w: 4,
                  h: 2,
                  source: '${sales}',
                },
              ],
            },
          ],
        }}
        data={{ sales: { total: 42 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const content = screen.getByTestId('panel-content');
    expect(content.getAttribute('data-data')).toBe(JSON.stringify({ total: 42 }));
    expect(content.getAttribute('data-source')).toBe(JSON.stringify({ total: 42 }));
  });

  it('renders the panel chrome title when provided', () => {
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-title"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard',
              panels: [
                { id: 'p1', type: 'panel-content', title: 'Sales KPI', x: 0, y: 0, w: 4, h: 2 },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Sales KPI')).toBeTruthy();
  });

  it('renders the empty region when the layout has no panels (dashboard-empty-data)', () => {
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard',
              empty: { type: 'text', text: 'no panels yet' },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const root = document.querySelector('.nop-dashboard') as HTMLElement;
    expect(root.getAttribute('data-empty')).toBe('');
    expect(screen.getByText('no panels yet')).toBeTruthy();
  });

  it('skips unregistered panel types with a dev warn (dashboard-layout-invalid)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-unknown"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard',
              panels: [
                { id: 'p1', type: 'panel-content', x: 0, y: 0, w: 4, h: 2 },
                { id: 'p2', type: 'not-registered-type', x: 4, y: 0, w: 4, h: 2 },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const root = document.querySelector('.nop-dashboard') as HTMLElement;
    expect(root.getAttribute('data-panel-count')).toBe('2');
    expect(screen.getAllByTestId('panel-content')).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      '[dashboard] panel "p2" type "not-registered-type" is not registered, skipped',
    );
  });

  it('honors cols/rowHeight/gap/height props in canvas sizing', () => {
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-geometry"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard',
              cols: 6,
              rowHeight: 60,
              gap: 12,
              height: 480,
              panels: [
                { id: 'p1', type: 'panel-content', x: 0, y: 0, w: 3, h: 2 },
                { id: 'p2', type: 'panel-content', x: 3, y: 0, w: 3, h: 2 },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const canvas = document.querySelector('[data-slot="dashboard-canvas"]') as HTMLElement;
    expect(canvas.style.height).toBe('480px');
    const panels = document.querySelectorAll('[data-slot="dashboard-panel"]');
    // rowHeight 60 + gap 12: panel height = 2*60 + 12 = 132px
    expect((panels[0] as HTMLElement).style.height).toBe('132px');
    // cellWidth = (1200 - 5*12)/6 = 190; panel width = 3*190 + 2*12 = 594px
    expect((panels[0] as HTMLElement).style.width).toBe('594px');
  });

  it('derives canvas height from panel bounds when height is not provided', () => {
    const SchemaRenderer = createDashboardSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/runtime-derived-height"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard',
              panels: [{ id: 'p1', type: 'panel-content', x: 0, y: 0, w: 4, h: 3 }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const canvas = document.querySelector('[data-slot="dashboard-canvas"]') as HTMLElement;
    // 3 rows: 3*40 + 2*8 = 136px
    expect(canvas.style.height).toBe('136px');
  });
});

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

/**
 * V12f Phase 1 — 族3 (overflow/geometry):
 * - [G1-R2-视角8-01] steps horizontal connector is absolutely positioned, so the
 *   `li[data-slot=steps-item]` must be its containing block (`relative`); without
 *   it the connector resolves against the nearest positioned ancestor and the
 *   line escapes the step column.
 * - [G1-R4-视角8-01] timeline horizontal axis segment is a flex child in a
 *   `flex-col items-center` row; with only `h-px` it has no width source and
 *   collapses to 0px — an invisible connector. The segment must carry an explicit
 *   full-width source (`w-full`).
 */
describe('V12f 族3 — steps/timeline connector geometry contracts', () => {
  afterEach(() => {
    cleanup();
  });

  it('[G1-R2-视角8-01] steps items are the containing block for the horizontal connector', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/v12f-steps-connector"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              value: 'b',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B' },
                { value: 'c', title: 'C' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const items = document.querySelectorAll<HTMLElement>('[data-slot="steps-item"]');
    expect(items.length).toBe(3);
    items.forEach((item) => {
      expect(item.className).toContain('relative');
    });

    // Connector segments (index > 0) are absolutely positioned and therefore
    // depend on the li containing block.
    const connectors = document.querySelectorAll('[data-slot="steps-connector"]');
    expect(connectors.length).toBe(2);
    connectors.forEach((connector) => {
      expect(connector.className).toContain('absolute');
    });
  });

  it('[G1-R4-视角8-01] timeline horizontal axis segments carry an explicit width source', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/v12f-timeline-horizontal-axis"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              orientation: 'horizontal',
              items: [
                { time: '09:00', title: 'First' },
                { time: '11:30', title: 'Second' },
                { time: '14:00', title: 'Third' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-timeline') as HTMLElement;
    expect(root.getAttribute('data-orientation')).toBe('horizontal');

    const axisSegments = document.querySelectorAll<HTMLElement>(
      '[data-slot="timeline-axis"]',
    );
    // One connector per gap between items (index > 0).
    expect(axisSegments.length).toBe(2);
    axisSegments.forEach((segment) => {
      expect(segment.className).toContain('w-full');
    });
  });
});

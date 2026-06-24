// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function timelineRoot() {
  return document.querySelector('.nop-timeline') as HTMLElement;
}

function items() {
  return document.querySelectorAll('[data-slot="timeline-item"]');
}

function titles() {
  return Array.from(document.querySelectorAll('[data-slot="timeline-title"]')).map(
    (el) => el.textContent,
  );
}

describe('TimelineRenderer (W4b — display collection, no owner state)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nop-timeline marker with time/title/detail for each item', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline',
              items: [
                { time: '09:00', title: 'Created', detail: 'by Alice' },
                { time: '11:30', title: 'Approved', detail: 'by Bob' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = timelineRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('timeline-root');
    expect(root.getAttribute('data-orientation')).toBe('vertical');
    expect(root.getAttribute('data-mode')).toBe('left');
    expect(items().length).toBe(2);

    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.getByText('Created')).toBeTruthy();
    expect(screen.getByText('by Alice')).toBeTruthy();
    expect(screen.getByText('11:30')).toBeTruthy();
  });

  it('renders items in original order by default and reversed when reverse=true', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    const base = {
      type: 'timeline',
      items: [
        { time: '09:00', title: 'First' },
        { time: '11:30', title: 'Second' },
        { time: '14:00', title: 'Third' },
      ],
    } as const;

    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-order"
        schema={{ type: 'page', body: [base] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(titles()).toEqual(['First', 'Second', 'Third']);
    unmount();

    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-reverse"
        schema={{
          type: 'page',
          body: [{ ...base, reverse: true }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(timelineRoot().getAttribute('data-reverse')).toBe('true');
    expect(titles()).toEqual(['Third', 'Second', 'First']);
  });

  it('renders horizontal orientation', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-horizontal"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              orientation: 'horizontal',
              items: [
                { time: '09:00', title: 'A' },
                { time: '10:00', title: 'B' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(timelineRoot().getAttribute('data-orientation')).toBe('horizontal');
  });

  it('switches mode (left/right/alternate) and reflects on root + items', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    const base = {
      type: 'timeline',
      items: [
        { time: '09:00', title: 'A' },
        { time: '10:00', title: 'B' },
      ],
    } as const;

    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-right"
        schema={{ type: 'page', body: [{ ...base, mode: 'right' }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(timelineRoot().getAttribute('data-mode')).toBe('right');
    expect(items()[0]?.getAttribute('data-side')).toBe('left');
    unmount();

    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-alternate"
        schema={{ type: 'page', body: [{ ...base, mode: 'alternate' }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(timelineRoot().getAttribute('data-mode')).toBe('alternate');
    // alternate: even index -> right, odd index -> left
    expect(items()[0]?.getAttribute('data-side')).toBe('right');
    expect(items()[1]?.getAttribute('data-side')).toBe('left');
  });

  it('maps item level to the marker data-level attribute', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-level"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              items: [
                { title: 'A', level: 'success' },
                { title: 'B', level: 'error' },
                { title: 'C' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(items()[0]?.getAttribute('data-level')).toBe('success');
    expect(items()[1]?.getAttribute('data-level')).toBe('error');
    // missing level -> default primary
    expect(items()[2]?.getAttribute('data-level')).toBe('primary');
  });

  it('degrades gracefully when an item is missing time/title', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-missing-field"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              items: [
                { title: 'Has Title' },
                { time: '12:00' },
                { title: 'Full', detail: 'd', time: '13:00' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // All three items render (no crash)
    expect(items().length).toBe(3);
    // Item 0: title only, no time/detail nodes
    expect(document.querySelectorAll('[data-slot="timeline-time"]').length).toBe(2);
    expect(document.querySelectorAll('[data-slot="timeline-title"]').length).toBe(2);
    expect(screen.getByText('Has Title')).toBeTruthy();
    expect(screen.getByText('12:00')).toBeTruthy();
  });

  it('renders empty state when items is empty', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-empty"
        schema={{
          type: 'page',
          body: [{ type: 'timeline', testid: 'demo-timeline-empty', items: [] }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = timelineRoot();
    expect(root.getAttribute('data-empty')).toBe('true');
    expect(document.querySelector('[data-slot="timeline-empty"]')).toBeTruthy();
    expect(items().length).toBe(0);
  });
});

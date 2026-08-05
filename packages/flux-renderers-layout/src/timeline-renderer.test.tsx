import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function activeItems() {
  return Array.from(items()).filter((el) => el.getAttribute('data-state') === 'active');
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

describe('TimelineRenderer v2 — controlled current event (value/defaultValue/valueOwnership/valueStatePath/onChange)', () => {
  afterEach(() => {
    cleanup();
  });

  it('marks the key-matched item active and publishes data-active-index', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-key"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-v2-key',
              value: 't2',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
                { value: 't3', title: 'Three' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(timelineRoot().getAttribute('data-active-index')).toBe('1');
    const active = activeItems();
    expect(active.length).toBe(1);
    expect(active[0]?.getAttribute('data-item-index')).toBe('1');
    expect(active[0]?.querySelector('[data-slot="timeline-title"]')?.textContent).toBe('Two');
  });

  it('treats a numeric value as a clamped index', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-numeric"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              value: 99,
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(timelineRoot().getAttribute('data-active-index')).toBe('1');
  });

  it('falls back to defaultValue when value does not match; no active (not first item) when both miss', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    const base = {
      type: 'timeline',
      items: [
        { value: 't1', title: 'One' },
        { value: 't2', title: 'Two' },
        { value: 't3', title: 'Three' },
      ],
    } as const;

    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-default-fallback"
        schema={{
          type: 'page',
          body: [{ ...base, value: 'missing', defaultValue: 't2' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(timelineRoot().getAttribute('data-active-index')).toBe('1');
    unmount();

    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-no-active"
        schema={{
          type: 'page',
          body: [{ ...base, value: 'missing' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    // Render-layer adjudication: unmatched -> no active state, explicitly NOT the first item.
    expect(timelineRoot().getAttribute('data-active-index')).toBeNull();
    expect(activeItems().length).toBe(0);
  });

  it('resolves active by logical order under reverse and renders it at the reversed position', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-reverse"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              reverse: true,
              value: 't2',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
                { value: 't3', title: 'Three' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Reversed DOM order: Three, Two, One. Active = logical index 1 (t2).
    expect(titles()).toEqual(['Three', 'Two', 'One']);
    expect(timelineRoot().getAttribute('data-active-index')).toBe('1');
    const active = activeItems();
    expect(active.length).toBe(1);
    expect(active[0]?.querySelector('[data-slot="timeline-title"]')?.textContent).toBe('Two');
    expect(active[0]?.getAttribute('data-item-index')).toBe('1');
  });

  it('writes back locally and dispatches onChange on click (local default)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-local"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-v2-local',
              defaultValue: 't1',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'tlTouched', value: true },
              },
            },
            { type: 'text', text: 'tl:${tlTouched ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(timelineRoot().getAttribute('data-active-index')).toBe('0');
    expect(items()[0]?.getAttribute('data-clickable')).toBe('true');
    expect(items()[0]?.hasAttribute('tabindex')).toBe(true);

    fireEvent.click(items()[1]);
    await waitFor(() => expect(timelineRoot().getAttribute('data-active-index')).toBe('1'));
    expect(screen.getByText('tl:yes')).toBeTruthy();
  });

  it('dispatches onChange payload {value, index, item}', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-payload"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              defaultValue: 't1',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'tlPayload', value: '${value}|${index}|${item.title}' },
              },
            },
            { type: 'text', text: 'payload:${tlPayload ?? "none"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('payload:none')).toBeTruthy();
    fireEvent.click(items()[1]);
    await waitFor(() => expect(screen.getByText('payload:t2|1|Two')).toBeTruthy());
  });

  it('controlled ownership: value drives active, clicks dispatch onChange but do not mutate', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-controlled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-v2-controlled',
              valueOwnership: 'controlled',
              value: 't1',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'tlCtrlTouched', value: true },
              },
            },
            { type: 'text', text: 'ctrl:${tlCtrlTouched ? "touched" : "untouched"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(timelineRoot().getAttribute('data-ownership')).toBe('controlled');
    expect(timelineRoot().getAttribute('data-active-index')).toBe('0');

    fireEvent.click(items()[1]);
    await waitFor(() => expect(screen.getByText('ctrl:touched')).toBeTruthy());
    // Controlled: value 't1' still drives the active state.
    expect(timelineRoot().getAttribute('data-active-index')).toBe('0');
  });

  it('writes back to scope when valueOwnership=scope and valueStatePath is set', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-v2-scope',
              valueOwnership: 'scope',
              valueStatePath: 'tlActive',
              defaultValue: 't1',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'tlScopeTouched', value: true },
              },
            },
            { type: 'text', text: 'scope:${tlActive ?? "none"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(timelineRoot().getAttribute('data-ownership')).toBe('scope');
    fireEvent.click(items()[1]);
    await waitFor(() => expect(screen.getByText('scope:t2')).toBeTruthy());
    expect(timelineRoot().getAttribute('data-active-index')).toBe('1');
  });

  it('degrades scope ownership (missing valueStatePath) to local controlled with a dev warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-scope-degraded"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-v2-scope-degraded',
              valueOwnership: 'scope',
              defaultValue: 't1',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'tlDegradedTouched', value: true },
              },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(timelineRoot().getAttribute('data-ownership')).toBe('local');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[nop-timeline] valueOwnership=scope requires valueStatePath'),
    );
    // Degraded mode stays interactive.
    fireEvent.click(items()[1]);
    await waitFor(() => expect(timelineRoot().getAttribute('data-active-index')).toBe('1'));
    warnSpy.mockRestore();
  });

  it('items are NOT clickable when onChange is not declared (display-only zero regression)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-v2-static"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-static',
              value: 't2',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(items().length).toBe(2);
    for (const item of Array.from(items())) {
      expect(item.getAttribute('data-clickable')).toBeNull();
      expect(item.hasAttribute('tabindex')).toBe(false);
      expect(item.hasAttribute('role')).toBe(false);
    }
    // Active highlight still works in display-only mode.
    expect(timelineRoot().getAttribute('data-active-index')).toBe('1');
  });
});

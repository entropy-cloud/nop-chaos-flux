import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function timelineRoot() {
  return document.querySelector('.nop-timeline') as HTMLElement;
}

function items() {
  return document.querySelectorAll('[data-slot="timeline-item"]');
}

// P2-13 (08-11 audit, plan 483 A5): a root-disabled timeline kept its items
// focusable with role="button" and no aria-disabled — inert-but-focusable.
describe('P2-13: root-disabled timeline items carry aria-disabled and are inert', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes aria-disabled, drops interactive affordances, and does not seek on click', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-p2-13"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-p2-13',
              disabled: true,
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

    for (const item of Array.from(items())) {
      expect(item.getAttribute('aria-disabled')).toBe('true');
      expect(item.hasAttribute('tabindex')).toBe(false);
      expect(item.getAttribute('role')).toBeNull();
      expect(item.getAttribute('data-clickable')).toBeNull();
    }

    fireEvent.click(items()[1]);
    await waitFor(() => expect(timelineRoot().getAttribute('data-active-index')).toBe('0'));
    expect(screen.getByText('tl:no')).toBeTruthy();
  });

  it('keeps enabled clickable timelines interactive (no regression)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/timeline-p2-13-enabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              testid: 'demo-timeline-p2-13-enabled',
              defaultValue: 't1',
              items: [
                { value: 't1', title: 'One' },
                { value: 't2', title: 'Two' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'tlTouched2', value: true },
              },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(items()[0]?.getAttribute('aria-disabled')).toBeNull();
    expect(items()[0]?.hasAttribute('tabindex')).toBe(true);
    fireEvent.click(items()[1]);
    await waitFor(() => expect(timelineRoot().getAttribute('data-active-index')).toBe('1'));
  });
});

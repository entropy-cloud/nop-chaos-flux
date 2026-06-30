import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const SchemaRenderer = createDataSchemaRenderer();

function renderList() {
  return render(
    <SchemaRenderer
      schemaUrl="test://data/list-responsive"
      schema={{
        type: 'page',
        body: [
          {
            type: 'list',
            items: '${rows}',
            item: { type: 'text', text: '${$slot.item.label}' },
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

function listRoot() {
  return document.querySelector('.nop-list') as HTMLElement;
}

describe('ListRenderer responsive — hairline migration + touch (successor)', () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });

  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
  });

  it('migrates inter-item dividers from divide-y to nop-hairline on desktop (no divide-y)', () => {
    renderList();

    const root = listRoot();
    expect(root.className).not.toContain('divide-y');
    expect(root.className).not.toContain('divide-border');

    const items = root.querySelectorAll('[data-slot="list-item"]');
    expect(items.length).toBe(3);
    // All items except the last carry the hairline bottom edge.
    expect(items[0]!.className).toContain('nop-hairline--bottom');
    expect(items[1]!.className).toContain('nop-hairline--bottom');
    expect(items[2]!.className).not.toContain('nop-hairline--bottom');
  });

  it('keeps desktop row padding at py-2 and emits no narrow marker (no regression)', () => {
    renderList();

    const root = listRoot();
    expect(root.getAttribute('data-responsive')).toBeNull();
    expect(root.className).not.toContain('touch-pan-y');

    const items = root.querySelectorAll('[data-slot="list-item"]');
    expect(items[0]!.className).toContain('py-2');
    expect(items[0]!.className).not.toContain('py-3');
  });

  it('enhances touch targets (py-3), adds touch-pan-y, and emits the narrow marker on mobile', () => {
    mobileState.isMobile = true;
    renderList();

    const root = listRoot();
    expect(root.getAttribute('data-responsive')).toBe('narrow');
    expect(root.className).toContain('touch-pan-y');

    const items = root.querySelectorAll('[data-slot="list-item"]');
    expect(items[0]!.className).toContain('py-3');
    expect(items[0]!.className).not.toContain('py-2');
    // Hairline still present on mobile.
    expect(items[0]!.className).toContain('nop-hairline--bottom');
    expect(items[2]!.className).not.toContain('nop-hairline--bottom');
  });

  it('marks the empty-state root narrow on mobile', () => {
    mobileState.isMobile = true;
    render(
      <SchemaRenderer
        schemaUrl="test://data/list-responsive-empty"
        schema={{
          type: 'page',
          body: [{ type: 'list', items: '${rows}', empty: { type: 'text', text: 'None' } }],
        }}
        data={{ rows: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = listRoot();
    expect(root.getAttribute('data-empty')).toBe('true');
    expect(root.getAttribute('data-responsive')).toBe('narrow');
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

/**
 * [G1-R3-视角8-01] Tabs mobile swipe must not claim gestures that begin inside a
 * horizontally-scrollable or natively-interactive descendant (overflow-x auto
 * region, slider, carousel): the nested scroller owns the horizontal axis, so
 * the panels swipe guard has to opt out at touch start.
 */

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

beforeEach(() => {
  mobileState.isMobile = true;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderTabs(schema: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://basic/tabs-swipe-exclusion"
      schema={schema as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    key: `tab-${i}`,
    title: `Tab ${i}`,
    body: { type: 'text', text: `Body ${i}` },
  }));
}

async function renderActiveTabs() {
  renderTabs({
    type: 'tabs',
    value: 'tab-1',
    items: makeItems(3),
  });

  await waitFor(() => {
    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
  });
}

function mountNestedTarget(markup: { scrollable?: boolean; interactive?: boolean }) {
  const swipeZone = document.querySelector('[data-slot="tabs-panels-swipe"]') as HTMLElement;
  expect(swipeZone).toBeTruthy();

  const target = document.createElement('span');
  target.setAttribute('data-testid', 'nested-swipe-target');

  if (markup.scrollable) {
    const scroller = document.createElement('div');
    scroller.setAttribute('data-testid', 'nested-h-scroller');
    scroller.style.overflowX = 'auto';
    // jsdom performs no layout: pin the scrollability signal explicitly.
    Object.defineProperty(scroller, 'scrollWidth', { value: 600, configurable: true });
    Object.defineProperty(scroller, 'clientWidth', { value: 240, configurable: true });
    scroller.appendChild(target);
    const content = swipeZone.querySelector('[data-slot="tabs-content"]') as HTMLElement;
    content.appendChild(scroller);
  } else {
    const content = swipeZone.querySelector('[data-slot="tabs-content"]') as HTMLElement;
    content.appendChild(target);
  }

  if (markup.interactive) {
    target.setAttribute('role', 'slider');
    target.setAttribute('aria-label', 'nested rate slider');
  }

  return target;
}

function swipeLeftFrom(target: HTMLElement) {
  fireEvent.touchStart(target, {
    touches: [{ clientX: 200, clientY: 50 }],
  });
  fireEvent.touchMove(target, {
    touches: [{ clientX: 100, clientY: 50 }],
  });
  fireEvent.touchEnd(target, {
    changedTouches: [{ clientX: 100, clientY: 50 }],
  });
}

describe('tabs swipe — nested horizontal interaction exclusion (G1-R3-视角8-01)', () => {
  it('does not switch tabs when the swipe starts inside a horizontally-scrollable descendant', async () => {
    await renderActiveTabs();

    const target = mountNestedTarget({ scrollable: true });
    swipeLeftFrom(target);

    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
  });

  it('does not switch tabs when the swipe starts on a natively-interactive descendant (slider thumb)', async () => {
    await renderActiveTabs();

    const target = mountNestedTarget({ interactive: true });
    swipeLeftFrom(target);

    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
  });

  it('still switches tabs when the swipe starts on plain panel content', async () => {
    await renderActiveTabs();

    const bodyText = screen.getByText('Body 1');
    swipeLeftFrom(bodyText);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 2' }).getAttribute('aria-selected')).toBe('true');
    });
  });
});

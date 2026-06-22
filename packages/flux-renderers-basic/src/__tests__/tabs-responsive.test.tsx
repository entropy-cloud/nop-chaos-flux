import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '../index.js';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderTabs(schema: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://basic/tabs-responsive"
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

describe('tabs renderer — responsive (M1d)', () => {
  it('adds horizontal scroll classes to TabsList on mobile', () => {
    mobileState.isMobile = true;
    renderTabs({
      type: 'tabs',
      items: makeItems(3),
    });

    const tabsList = document.querySelector('[data-slot="tabs-list"]') as HTMLElement;
    expect(tabsList).toBeTruthy();
    expect(tabsList.className).toContain('overflow-x-auto');
  });

  it('does not add horizontal scroll classes on desktop', () => {
    mobileState.isMobile = false;
    renderTabs({
      type: 'tabs',
      items: makeItems(3),
    });

    const tabsList = document.querySelector('[data-slot="tabs-list"]') as HTMLElement;
    expect(tabsList.className).not.toContain('overflow-x-auto');
  });

  it('renders the swipe panels wrapper on mobile only', () => {
    mobileState.isMobile = false;
    renderTabs({ type: 'tabs', items: makeItems(2) });
    expect(document.querySelector('[data-slot="tabs-panels-swipe"]')).toBeNull();

    cleanup();
    mobileState.isMobile = true;
    renderTabs({ type: 'tabs', items: makeItems(2) });
    expect(document.querySelector('[data-slot="tabs-panels-swipe"]')).toBeTruthy();
  });

  it('switches to next tab on left swipe (>50px) on mobile', async () => {
    mobileState.isMobile = true;
    renderTabs({
      type: 'tabs',
      value: 'tab-1',
      items: makeItems(3),
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
    });

    const swipeZone = document.querySelector('[data-slot="tabs-panels-swipe"]') as HTMLElement;
    fireEvent.touchStart(swipeZone, {
      touches: [{ clientX: 200, clientY: 50 }],
    });
    fireEvent.touchMove(swipeZone, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchEnd(swipeZone, {
      changedTouches: [{ clientX: 100, clientY: 50 }],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 2' }).getAttribute('aria-selected')).toBe('true');
    });
  });

  it('switches to previous tab on right swipe (>50px) on mobile', async () => {
    mobileState.isMobile = true;
    renderTabs({
      type: 'tabs',
      value: 'tab-1',
      items: makeItems(3),
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
    });

    const swipeZone = document.querySelector('[data-slot="tabs-panels-swipe"]') as HTMLElement;
    fireEvent.touchStart(swipeZone, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(swipeZone, {
      touches: [{ clientX: 200, clientY: 50 }],
    });
    fireEvent.touchEnd(swipeZone, {
      changedTouches: [{ clientX: 200, clientY: 50 }],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 0' }).getAttribute('aria-selected')).toBe('true');
    });
  });

  it('does not switch tab when swipe is below threshold', async () => {
    mobileState.isMobile = true;
    renderTabs({
      type: 'tabs',
      value: 'tab-1',
      items: makeItems(3),
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
    });

    const swipeZone = document.querySelector('[data-slot="tabs-panels-swipe"]') as HTMLElement;
    fireEvent.touchStart(swipeZone, {
      touches: [{ clientX: 150, clientY: 50 }],
    });
    fireEvent.touchMove(swipeZone, {
      touches: [{ clientX: 130, clientY: 50 }],
    });
    fireEvent.touchEnd(swipeZone, {
      changedTouches: [{ clientX: 130, clientY: 50 }],
    });

    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
  });

  it('does not switch past the last tab on left swipe at boundary', async () => {
    mobileState.isMobile = true;
    renderTabs({
      type: 'tabs',
      value: 'tab-2',
      items: makeItems(3),
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 2' }).getAttribute('aria-selected')).toBe('true');
    });

    const swipeZone = document.querySelector('[data-slot="tabs-panels-swipe"]') as HTMLElement;
    fireEvent.touchStart(swipeZone, {
      touches: [{ clientX: 200, clientY: 50 }],
    });
    fireEvent.touchMove(swipeZone, {
      touches: [{ clientX: 50, clientY: 50 }],
    });
    fireEvent.touchEnd(swipeZone, {
      changedTouches: [{ clientX: 50, clientY: 50 }],
    });

    expect(screen.getByRole('tab', { name: 'Tab 2' }).getAttribute('aria-selected')).toBe('true');
  });

  it('does not trigger swipe switch on desktop', async () => {
    mobileState.isMobile = false;
    renderTabs({
      type: 'tabs',
      value: 'tab-1',
      items: makeItems(3),
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
    });

    expect(document.querySelector('[data-slot="tabs-panels-swipe"]')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
  });

  it('does not interfere with vertical scroll (deltaY > deltaX cancels swipe)', async () => {
    mobileState.isMobile = true;
    renderTabs({
      type: 'tabs',
      value: 'tab-1',
      items: makeItems(3),
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
    });

    const swipeZone = document.querySelector('[data-slot="tabs-panels-swipe"]') as HTMLElement;
    fireEvent.touchStart(swipeZone, {
      touches: [{ clientX: 150, clientY: 100 }],
    });
    fireEvent.touchMove(swipeZone, {
      touches: [{ clientX: 130, clientY: 300 }],
    });
    fireEvent.touchEnd(swipeZone, {
      changedTouches: [{ clientX: 100, clientY: 350 }],
    });

    expect(screen.getByRole('tab', { name: 'Tab 1' }).getAttribute('aria-selected')).toBe('true');
  });
});

describe('tabs responsive — uses createSchemaRenderer with basicRendererDefinitions only', () => {
  it('tabs swipe marker absent when rendered through raw schema renderer on desktop', () => {
    mobileState.isMobile = false;
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/tabs-responsive-raw"
        schema={{
          type: 'tabs',
          items: makeItems(2),
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(document.querySelector('[data-slot="tabs-panels-swipe"]')).toBeNull();
  });
});

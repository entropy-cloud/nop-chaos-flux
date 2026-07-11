import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// happy-dom does not implement Pointer Capture; stub the relevant Element methods
// so pointer-event-driven resize is testable.
beforeAll(() => {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

afterEach(() => cleanup());

function renderPage(schemaProps: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://page-aside-resizable"
      schema={
        {
          type: 'page',
          aside: [{ type: 'text', text: 'sidebar' }],
          body: [{ type: 'text', text: 'main' }],
          ...schemaProps,
        } as never
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('Page asideResizable / asideSticky', () => {
  it('renders a resize handle when asideResizable is true', () => {
    const { container } = renderPage({ asideResizable: true });
    const handle = container.querySelector('[data-slot="page-aside-resize-handle"]');
    expect(handle).toBeTruthy();
    const aside = container.querySelector('[data-slot="page-aside"]');
    expect(aside?.getAttribute('data-aside-resizable')).toBe('true');
    // initial width clamps to min (200).
    expect(aside?.getAttribute('style') ?? '').toContain('width: 200px');
  });

  it('does not render a resize handle when asideResizable is absent', () => {
    const { container } = renderPage({});
    const handle = container.querySelector('[data-slot="page-aside-resize-handle"]');
    expect(handle).toBeNull();
    const aside = container.querySelector('[data-slot="page-aside"]');
    expect(aside?.getAttribute('data-aside-resizable')).toBeNull();
  });

  it('pointer drag changes the aside width and clamps to min/max', () => {
    const { container } = renderPage({
      asideResizable: true,
      asideMinWidth: 100,
      asideMaxWidth: 300,
    });
    const aside = container.querySelector<HTMLElement>('[data-slot="page-aside"]');
    // initial width clamps to min (100).
    expect(aside?.style.width).toBe('100px');

    const handle = container.querySelector<HTMLElement>(
      '[data-slot="page-aside-resize-handle"]',
    )!;
    // Simulate a drag: pointerdown → pointermove (+250px) → pointerup.
    fireEvent.pointerDown(handle, { clientX: 0, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 250, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 250, pointerId: 1 });
    // 100 + 250 = 350 → clamped to max 300.
    expect(aside?.style.width).toBe('300px');
  });

  it('dragging left (negative dx) does not go below min', () => {
    const { container } = renderPage({
      asideResizable: true,
      asideMinWidth: 150,
      asideMaxWidth: 400,
    });
    const aside = container.querySelector<HTMLElement>('[data-slot="page-aside"]');
    expect(aside?.style.width).toBe('150px');
    const handle = container.querySelector<HTMLElement>(
      '[data-slot="page-aside-resize-handle"]',
    )!;
    fireEvent.pointerDown(handle, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 0, pointerId: 1 }); // -100
    fireEvent.pointerUp(handle, { clientX: 0, pointerId: 1 });
    // 150 - 100 = 50 → clamped to min 150.
    expect(aside?.style.width).toBe('150px');
  });

  it('asidePosition right reverses the drag direction', () => {
    const { container } = renderPage({
      asideResizable: true,
      asidePosition: 'right',
      asideMinWidth: 100,
      asideMaxWidth: 400,
    });
    const aside = container.querySelector<HTMLElement>('[data-slot="page-aside"]');
    expect(aside?.style.width).toBe('100px');
    const handle = container.querySelector<HTMLElement>(
      '[data-slot="page-aside-resize-handle"]',
    )!;
    // Dragging left (negative dx) on a right-positioned aside should WIDEN it.
    fireEvent.pointerDown(handle, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 0, pointerId: 1 }); // dx = -100 → effective +100
    fireEvent.pointerUp(handle, { clientX: 0, pointerId: 1 });
    expect(aside?.style.width).toBe('200px');
  });

  it('asideSticky applies sticky CSS', () => {
    const { container } = renderPage({ asideSticky: true });
    const aside = container.querySelector<HTMLElement>('[data-slot="page-aside"]');
    expect(aside?.getAttribute('data-aside-sticky')).toBe('true');
    expect(aside?.style.position).toBe('sticky');
    expect(aside?.style.top).toBe('0px');
    expect(aside?.style.maxHeight).toBe('100vh');
    expect(aside?.style.overflowY).toBe('auto');
  });

  it('ignores right-click on the resize handle', () => {
    const { container } = renderPage({ asideResizable: true, asideMinWidth: 100, asideMaxWidth: 400 });
    const aside = container.querySelector<HTMLElement>('[data-slot="page-aside"]');
    const handle = container.querySelector<HTMLElement>(
      '[data-slot="page-aside-resize-handle"]',
    )!;
    // Right-click (button === 2) should not start a drag.
    fireEvent.pointerDown(handle, { clientX: 0, button: 2, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 300, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 300, pointerId: 1 });
    expect(aside?.style.width).toBe('100px');
  });
});

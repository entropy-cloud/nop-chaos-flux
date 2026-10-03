/**
 * 覆盖层测试（S1 §5.2）：选择/hover/DropHint 视觉投影、预览态隐藏。
 * 矩形通过 patch `getBoundingClientRect` 注入（happy-dom 无真实几何）。
 */

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasOverlay } from './canvas-overlay.js';
import type { DesignerDropHint } from './types.js';

afterEach(cleanup);

const RECTS = new Map<string, { left: number; top: number; width: number; height: number }>([
  ['psid-page', { left: 0, top: 0, width: 800, height: 600 }],
  ['psid-text', { left: 20, top: 20, width: 120, height: 32 }],
  ['psid-container', { left: 20, top: 80, width: 0, height: 0 }],
]);

function mountOverlay(
  props: Partial<Parameters<typeof CanvasOverlay>[0]> & {
    nodeAttrs?: Record<string, Record<string, string>>;
  } = {},
) {
  const { nodeAttrs, ...overlayProps } = props;
  const root = document.createElement('div');
  for (const [sid] of RECTS) {
    const child = document.createElement('div');
    child.setAttribute('data-psid', sid);
    for (const [key, value] of Object.entries(nodeAttrs?.[sid] ?? {})) {
      child.setAttribute(key, value);
    }
    root.appendChild(child);
  }
  document.body.appendChild(root);
  const rectSpy = vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      const sid = (this as HTMLElement).getAttribute?.('data-psid');
      const rect = sid ? RECTS.get(sid) : undefined;
      return {
        x: rect?.left ?? 0,
        y: rect?.top ?? 0,
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
        top: rect?.top ?? 0,
        left: rect?.left ?? 0,
        right: (rect?.left ?? 0) + (rect?.width ?? 0),
        bottom: (rect?.top ?? 0) + (rect?.height ?? 0),
        toJSON: () => ({}),
      } as DOMRect;
    });
  const ref = { current: root };
  const view = render(
    <CanvasOverlay
      rootRef={ref}
      selection={['psid-text']}
      hoverNodeId={null}
      dropHint={null}
      visible
      {...overlayProps}
    />,
  );
  return { view, rectSpy };
}

describe('CanvasOverlay', () => {
  it('renders selection box anchored to the node rect', async () => {
    mountOverlay();
    await waitFor(() => expect(document.querySelector('[data-page-designer-box="selection"]')).toBeTruthy());
    const box = document.querySelector('[data-page-designer-box="selection"]');
    expect(box).toBeTruthy();
    expect(box!.getAttribute('style')).toContain('width: 120px');
  });

  it('derives the selection frame identity from the target anchor (sid fallback)', async () => {
    mountOverlay();
    await waitFor(() => expect(document.getElementById('nop-frame-psid-text')).toBeTruthy());
    const frame = document.getElementById('nop-frame-psid-text')!;
    expect(frame.getAttribute('data-frame-for')).toBe('psid-text');
    expect(frame.getAttribute('data-page-designer-box')).toBe('selection');
  });

  it('prefers data-cid over the sid for the frame identity when present', async () => {
    mountOverlay({ nodeAttrs: { 'psid-text': { 'data-cid': 'cid-42' } } });
    await waitFor(() => expect(document.getElementById('nop-frame-cid-42')).toBeTruthy());
    expect(document.getElementById('nop-frame-psid-text')).toBeNull();
    expect(document.getElementById('nop-frame-cid-42')!.getAttribute('data-frame-for')).toBe('cid-42');
  });

  it('never renders frame identity on hover chrome', async () => {
    mountOverlay({ hoverNodeId: 'psid-page' });
    await waitFor(() => expect(document.querySelector('[data-page-designer-box="hover"]')).toBeTruthy());
    expect(document.querySelector('[data-page-designer-box="hover"]')!.getAttribute('data-frame-for')).toBeNull();
  });

  it('renders hover box for non-selected hover node', async () => {
    mountOverlay({ hoverNodeId: 'psid-page' });
    await waitFor(() => expect(document.querySelector('[data-page-designer-box="hover"]')).toBeTruthy());
    expect(document.querySelector('[data-page-designer-box="hover"]')).toBeTruthy();
    expect(document.querySelector('[data-page-designer-box="selection"]')).toBeTruthy();
  });

  it('skips hover box when the hovered node is also selected', () => {
    mountOverlay({ hoverNodeId: 'psid-text' });
    expect(document.querySelector('[data-page-designer-box="hover"]')).toBeNull();
  });

  it('renders inside drop hint on the parent box', async () => {
    mountOverlay({ dropHint: { kind: 'inside', parentId: 'psid-page', regionKey: 'body', index: 0 } as DesignerDropHint });
    const hint = await waitFor(() => {
      const element = document.querySelector('[data-drop-hint="inside"]');
      expect(element).toBeTruthy();
      return element!;
    });
    expect(hint!.getAttribute('style')).toContain('dashed');
  });

  it('renders before/after insertion bars', async () => {
    mountOverlay({
      dropHint: { kind: 'after', parentId: 'psid-page', regionKey: 'body', index: 1 } as DesignerDropHint,
    });
    const bar = await waitFor(() => {
      const element = document.querySelector('[data-drop-hint="after"]');
      expect(element).toBeTruthy();
      return element!;
    });
    expect(bar!.getAttribute('style')).toContain('height: 4px');
  });

  it('renders placeholder box with type label for empty containers (ux-r5)', async () => {
    const root = document.createElement('div');
    for (const [sid] of RECTS) {
      const child = document.createElement('div');
      child.setAttribute('data-psid', sid);
      if (sid === 'psid-container') child.setAttribute('data-pd-empty-label', 'container');
      root.appendChild(child);
    }
    document.body.appendChild(root);
    const rectSpy = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        const sid = (this as HTMLElement).getAttribute?.('data-psid');
        const rect = sid ? RECTS.get(sid) : undefined;
        return {
          x: rect?.left ?? 0,
          y: rect?.top ?? 0,
          width: rect?.width ?? 0,
          height: rect?.height ?? 0,
          top: rect?.top ?? 0,
          left: rect?.left ?? 0,
          right: (rect?.left ?? 0) + (rect?.width ?? 0),
          bottom: (rect?.top ?? 0) + (rect?.height ?? 0),
          toJSON: () => ({}),
        } as DOMRect;
      });
    const view = render(
      <CanvasOverlay
        rootRef={{ current: root }}
        selection={[]}
        hoverNodeId={null}
        dropHint={null}
        emptyContainers={[{ sid: 'psid-container', type: 'container' }]}
        visible
      />,
    );
    await waitFor(() => expect(document.querySelector('[data-page-designer-box="placeholder"]')).toBeTruthy());
    const box = document.querySelector('[data-page-designer-box="placeholder"]')!;
    // 0 尺寸锚点合成最小可视盒
    expect(box.getAttribute('style')).toContain('width: 160px');
    expect(box.getAttribute('style')).toContain('height: 44px');
    expect(box.textContent).toContain('container');
    view.unmount();
    rectSpy.mockRestore();
  });

  it('renders root-fallback cue instead of whole-page inside outline (ux-r5)', async () => {
    mountOverlay({
      dropHint: {
        kind: 'inside',
        parentId: 'psid-page',
        regionKey: 'body',
        index: 0,
        viaRootFallback: true,
      } as DesignerDropHint,
    });
    await waitFor(() => expect(document.querySelector('[data-drop-hint="root-fallback"]')).toBeTruthy());
    expect(document.querySelector('[data-drop-hint="inside"]')).toBeNull();
  });

  it('renders full-canvas rejection state for invalid hints', () => {
    mountOverlay({ dropHint: { kind: 'invalid' } });
    expect(document.querySelector('[data-drop-hint="invalid"]')).toBeTruthy();
  });

  it('renders hidden shell when not visible (preview mode)', () => {
    const { view } = mountOverlay({ visible: false });
    const overlay = view.container.querySelector('[data-page-designer-overlay]')!;
    expect(overlay.getAttribute('style')).toContain('none');
    expect(document.querySelector('[data-page-designer-box="selection"]')).toBeNull();
  });
});

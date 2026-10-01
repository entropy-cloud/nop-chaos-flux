/**
 * 组装页五件套叙事测试（S1 §5/§7/§8/§9 单测层）：
 * palette 落节点 → 画布锚点投影 → 点击选中 → inspector 改属性 → 导出 JSON 断言
 * 含变更且无 xui:sid（INV-E）；另覆盖画布 drop 命令通道与 undo。
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageDesigner } from './page-designer-page.js';

afterEach(cleanup);

async function openDesigner() {
  const view = render(<PageDesigner />);
  await waitFor(() => expect(view.getByTestId('page-designer-canvas')).toBeTruthy());
  await waitFor(() => {
    expect(document.querySelector('[data-psid]')).toBeTruthy();
  });
  return view;
}

function canvasAnchors(): HTMLElement[] {
  return [...document.querySelectorAll('[data-psid]')];
}

function exportedText(): string {
  return (screen.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement).value;
}

async function openSourceTab() {
  fireEvent.click(screen.getByText('JSON 源码'));
  await waitFor(() => expect(screen.getByTestId('page-designer-source-textarea')).toBeTruthy());
}

describe('PageDesigner assembly', () => {
  it('renders empty canvas state and palette whitelist', () => {
    const view = render(<PageDesigner />);
    expect(view.getByTestId('page-designer-root')).toBeTruthy();
    expect(view.getByTestId('page-designer-palette')).toBeTruthy();
    expect(document.querySelector('[data-palette-item="page"]')).toBeTruthy();
    expect(view.getByTestId('page-designer-canvas-empty')).toBeTruthy();
  });

  it('palette click inserts into page body and canvas projects a new anchor', async () => {
    const view = await openDesigner();
    const before = canvasAnchors().length;
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(canvasAnchors().length).toBe(before + 1));
    expect(view.queryByTestId('page-designer-canvas-empty')).toBeNull();
  });

  it('click selects a node; inspector edits propagate; export carries the change without sid', async () => {
    const view = await openDesigner();
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(canvasAnchors().length).toBeGreaterThan(1));

    const textAnchor = canvasAnchors().find((el) => el.getAttribute('data-psid') !== canvasAnchors()[0].getAttribute('data-psid'))!;
    const elementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = () => [textAnchor];
    try {
      fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
    } finally {
      document.elementsFromPoint = elementsFromPoint;
    }

    await waitFor(() => expect(document.querySelector('[data-inspector-field="tag"]')).toBeTruthy());
    const tagSelect = document.querySelector('[data-inspector-field="tag"] select') as HTMLSelectElement;
    fireEvent.change(tagSelect, { target: { value: 'h1' } });

    await openSourceTab();
    const exported = exportedText();
    expect(exported).toContain('"type": "text"');
    expect(exported).toContain('"tag": "h1"');
    expect(exported).not.toContain('xui:sid');
    expect(exported).not.toContain('psid-');
  });

  it('canvas drop dispatches insertNode via the command channel', async () => {
    const view = await openDesigner();
    const before = canvasAnchors().length;
    const canvas = view.getByTestId('page-designer-canvas');
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: () => JSON.stringify({ source: 'palette', type: 'button' }),
        dropEffect: 'copy',
      },
    });
    fireEvent(canvas, dropEvent);
    await waitFor(() => expect(canvasAnchors().length).toBe(before + 1));
    await openSourceTab();
    expect(exportedText()).toContain('"type": "button"');
  });

  it('undo reverts the last command', async () => {
    const view = await openDesigner();
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(canvasAnchors().length).toBe(2));
    fireEvent.click(view.getByTestId('page-designer-undo'));
    await waitFor(() => expect(canvasAnchors().length).toBe(1));
  });

  it('preview mode strips anchors and hides the overlay', async () => {
    const view = await openDesigner();
    fireEvent.click(view.getByTestId('page-designer-mode-toggle'));
    await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(0));
    expect(document.querySelector('[data-page-designer-overlay]')?.getAttribute('style')).toContain('none');
  });

  it('ux-r5: preview mode hides the left palette/structure panel and the right inspector', async () => {
    const view = await openDesigner();
    expect(view.getByTestId('page-designer-left-panel')).toBeTruthy();
    expect(view.getByTestId('page-designer-right-panel')).toBeTruthy();

    fireEvent.click(view.getByTestId('page-designer-mode-toggle'));

    await waitFor(() => {
      expect(view.queryByTestId('page-designer-left-panel')).toBeNull();
      expect(view.queryByTestId('page-designer-right-panel')).toBeNull();
    });
    // 画布仍在（运行态渲染），模式开关可返回编辑态
    expect(view.getByTestId('page-designer-canvas')).toBeTruthy();
    fireEvent.click(view.getByTestId('page-designer-mode-toggle'));
    await waitFor(() => expect(view.getByTestId('page-designer-left-panel')).toBeTruthy());
  });
});

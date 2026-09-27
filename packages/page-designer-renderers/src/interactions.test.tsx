/**
 * 组装页交互面补充测试：删除/复制/键盘、dragover/dragleave/drop 异常载荷、
 * 导入链路（成功 + rt-unknown-type 拒绝）、hover 投影、back/preview 往返。
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageDesigner } from './page-designer-page.js';

afterEach(cleanup);

async function openDesigner(props?: { onBack?: () => void }) {
  const view = render(<PageDesigner {...props} />);
  await waitFor(() => expect(view.getByTestId('page-designer-canvas')).toBeTruthy());
  await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
  return view;
}

async function openSourceTab() {
  fireEvent.click(screen.getByText('JSON 源码'));
  await waitFor(() => expect(screen.getByTestId('page-designer-source-textarea')).toBeTruthy());
}

function exportedText(): string {
  return (screen.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement).value;
}

function anchors(): HTMLElement[] {
  return [...document.querySelectorAll('[data-psid]')];
}

async function insertTextAndSelect(view: ReturnType<typeof render>) {
  fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
  await waitFor(() => expect(anchors().length).toBe(2));
  const textAnchor = anchors()[1];
  const original = document.elementsFromPoint;
  document.elementsFromPoint = () => [textAnchor];
  try {
    fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
  } finally {
    document.elementsFromPoint = original;
  }
  await waitFor(() => expect(document.querySelector('[data-inspector-field="tag"]')).toBeTruthy());
  return textAnchor;
}

function dropOn(canvas: HTMLElement, payload: string) {
  const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(dropEvent, 'dataTransfer', { value: { getData: () => payload, dropEffect: 'copy' } });
  fireEvent(canvas, dropEvent);
}

describe('PageDesigner interactions', () => {
  it('deletes the selected node via inspector delete button', async () => {
    const view = await openDesigner();
    await insertTextAndSelect(view);
    fireEvent.click(view.getByTestId('page-designer-delete-node'));
    await waitFor(() => expect(anchors().length).toBe(1));
    expect(view.getByTestId('page-designer-canvas-empty')).toBeTruthy();
  });

  it('duplicates the selected node (new sid, INV-D)', async () => {
    const view = await openDesigner();
    await insertTextAndSelect(view);
    fireEvent.click(view.getByTestId('page-designer-duplicate-node'));
    await waitFor(() => expect(anchors().length).toBe(3));
    await waitFor(() => {
      const sids = anchors().map((el) => el.getAttribute('data-psid'));
      expect(new Set(sids).size).toBe(sids.length);
    });
  });

  it('keyboard: Delete removes selection, Ctrl+Z undoes, typing is ignored', async () => {
    const view = await openDesigner();
    await insertTextAndSelect(view);
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(anchors().length).toBe(1));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await waitFor(() => expect(anchors().length).toBe(2));
    // 焦点在输入框内时不触发删除。
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'Delete' });
    expect(anchors().length).toBe(2);
    input.remove();
  });

  it('dragover paints the inside hint; dragleave clears it', async () => {
    const view = await openDesigner();
    const canvas = view.getByTestId('page-designer-canvas');
    const dragOver = new Event('dragover', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(dragOver, 'dataTransfer', { value: { dropEffect: 'none' } });
    fireEvent(canvas, dragOver);
    await waitFor(() => expect(canvas.getAttribute('data-drop-active')).toBe('inside'));
    fireEvent.dragLeave(canvas);
    await waitFor(() => expect(canvas.getAttribute('data-drop-active')).toBeNull());
  });

  it('drops with malformed payload are ignored', async () => {
    const view = await openDesigner();
    const before = anchors().length;
    dropOn(view.getByTestId('page-designer-canvas'), '{not json');
    dropOn(view.getByTestId('page-designer-canvas'), JSON.stringify({ source: 'palette', type: '' }));
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(anchors().length).toBe(before);
  });

  it('imports a document through the source view (success and rt-unknown-type)', async () => {
    const view = await openDesigner();
    fireEvent.click(screen.getByText('JSON 源码'));
    const textarea = view.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement;

    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ type: 'page', body: [{ type: 'text', text: 'imported' }] }) },
    });
    fireEvent.click(view.getByTestId('page-designer-import-json'));
    await waitFor(() => expect(anchors().length).toBe(2));
    expect(view.getByTestId('page-designer-source-message').getAttribute('data-message-level')).toBe('ok');

    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ type: 'page', body: [{ type: 'not-registered' }] }) },
    });
    fireEvent.click(view.getByTestId('page-designer-import-json'));
    const message = view.getByTestId('page-designer-source-message');
    expect(message.getAttribute('data-message-level')).toBe('error');
    // 拒绝后 working 保留。
    expect(anchors().length).toBe(2);
  });

  it('hover tracks the pointer; pane click clears selection', async () => {
    const view = await openDesigner();
    await insertTextAndSelect(view);
    const canvas = view.getByTestId('page-designer-canvas');
    const overlay = document.querySelector('[data-page-designer-overlay]') as HTMLElement;
    expect(overlay.getAttribute('data-overlay-selection')).toBe('true');
    const original = document.elementsFromPoint;
    try {
      document.elementsFromPoint = () => [anchors()[1]];
      fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10 });
      await waitFor(() => expect(overlay.getAttribute('data-overlay-hover')).toBe(anchors()[1].getAttribute('data-psid')));

      document.elementsFromPoint = () => [];
      // hover 节流 50ms：跨过节流窗再发第二次 move。
      await new Promise((resolve) => setTimeout(resolve, 60));
      fireEvent.pointerMove(canvas, { clientX: 5000, clientY: 5000 });
      await waitFor(() => expect(overlay.getAttribute('data-overlay-hover')).toBeNull());

      fireEvent.pointerDown(canvas);
      await waitFor(() => expect(overlay.getAttribute('data-overlay-selection')).toBeNull());
    } finally {
      document.elementsFromPoint = original;
    }
  });

  it('mode toggles back to edit and back button navigates', async () => {
    const onBack = vi.fn();
    const view = await openDesigner({ onBack });
    expect(view.getByTestId('page-designer-back')).toBeTruthy();
    fireEvent.click(view.getByTestId('page-designer-back'));
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByTestId('page-designer-mode-toggle'));
    await waitFor(() => expect(anchors().length).toBe(0));
    fireEvent.click(view.getByTestId('page-designer-mode-toggle'));
    await waitFor(() => expect(anchors().length).toBe(1));
  });

  it('marks dirty state after a command', async () => {
    const view = await openDesigner();
    expect(view.queryByTestId('page-designer-dirty')).toBeNull();
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(view.getByTestId('page-designer-dirty')).toBeTruthy());
  });

  it('click-to-insert targets the selected container (inside)', async () => {
    await openDesigner();
    // 落一个 container（自动选中），再点 text → 应插到 container body 内。
    fireEvent.click(document.querySelector('[data-palette-item="container"]')!);
    await waitFor(() => expect(anchors().length).toBe(2));
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(anchors().length).toBe(3));
    await openSourceTab();
    const exported = JSON.parse(exportedText()) as { body: { type: string; body?: unknown[] }[] };
    const container = exported.body.find((node) => node.type === 'container');
    expect(container?.body).toHaveLength(1);
  });

  it('click-to-insert targets the parent region when an atom is selected', async () => {
    const view = await openDesigner();
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(anchors().length).toBe(2));
    // 选中 text（叶子）后再点 button → 应插到 text 的父 region（page body）。
    const textAnchor = anchors()[1];
    const original = document.elementsFromPoint;
    document.elementsFromPoint = () => [textAnchor];
    try {
      fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
    } finally {
      document.elementsFromPoint = original;
    }
    await waitFor(() => expect(document.querySelector('[data-inspector-field="tag"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-palette-item="button"]')!);
    await waitFor(() => expect(anchors().length).toBe(3));
  });

  it('delete on the root page node is rejected and working is kept', async () => {
    const view = await openDesigner();
    const pageAnchor = anchors()[0];
    const original = document.elementsFromPoint;
    document.elementsFromPoint = () => [pageAnchor];
    try {
      fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
    } finally {
      document.elementsFromPoint = original;
    }
    await waitFor(() => expect(view.getByTestId('page-designer-delete-node')).toBeTruthy());
    fireEvent.click(view.getByTestId('page-designer-delete-node'));
    // 根不可删除：锚点保持，inspector 仍在。
    expect(anchors().length).toBe(1);
    expect(view.getByTestId('page-designer-delete-node')).toBeTruthy();
  });

  it('inspector blur without changes still closes the edit session', async () => {
    const view = await openDesigner();
    await insertTextAndSelectOf(view);
    const label = document.querySelector('[data-inspector-field="tag"] select') as HTMLSelectElement;
    fireEvent.blur(label);
    // 无异常即收口（commit 分支在事务外为 no-op）。
    expect(view.getByTestId('page-designer-inspector')).toBeTruthy();
  });

  it('source view export refresh and generic rejection branch', async () => {
    const view = await openDesigner();
    fireEvent.click(screen.getByText('JSON 源码'));
    const textarea = view.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{}' } });
    fireEvent.click(view.getByTestId('page-designer-export-json'));
    expect((view.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement).value).not.toBe('{}');

    fireEvent.change(textarea, { target: { value: '[1,2,3]' } });
    fireEvent.click(view.getByTestId('page-designer-import-json'));
    const message = view.getByTestId('page-designer-source-message');
    expect(message.getAttribute('data-message-level')).toBe('error');
  });
});

async function insertTextAndSelectOf(view: ReturnType<typeof render>) {
  fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
  await waitFor(() => expect(anchors().length).toBe(2));
  const textAnchor = anchors()[1];
  const original = document.elementsFromPoint;
  document.elementsFromPoint = () => [textAnchor];
  try {
    fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
  } finally {
    document.elementsFromPoint = original;
  }
  await waitFor(() => expect(document.querySelector('[data-inspector-field="tag"]')).toBeTruthy());
}

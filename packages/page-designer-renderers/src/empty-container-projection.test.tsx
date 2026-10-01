/**
 * 空容器投影测试（ux-r5 Phase 1）：
 * - 编辑态空容器锚点携带 `data-pd-empty` + 最小高度（可命中/可选中的视觉区域）；
 * - 容器获得子节点后投影清除；
 * - overlay 为空容器渲染占位框（虚线 + 类型标签）。
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageDesigner } from './page-designer-page.js';

afterEach(cleanup);

async function openDesigner() {
  const view = render(<PageDesigner />);
  await waitFor(() => expect(view.getByTestId('page-designer-canvas')).toBeTruthy());
  await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
  return view;
}

function anchors(): HTMLElement[] {
  return [...document.querySelectorAll('[data-psid]')] as HTMLElement[];
}

async function insertEmptyContainer(): Promise<HTMLElement> {
  fireEvent.click(document.querySelector('[data-palette-item="container"]')!);
  await waitFor(() => expect(anchors().length).toBe(2));
  return anchors()[1];
}

describe('空容器投影（ux-r5 PD-1）', () => {
  it('空容器锚点携带 data-pd-empty、类型标签与最小高度', async () => {
    await openDesigner();
    const container = await insertEmptyContainer();

    await waitFor(() => expect(container.getAttribute('data-pd-empty')).toBe('true'));
    expect(container.getAttribute('data-pd-empty-label')).toBe('container');
    expect(container.style.minHeight).toBe('44px');
  });

  it('容器获得子节点后投影清除', async () => {
    await openDesigner();
    const container = await insertEmptyContainer();
    await waitFor(() => expect(container.getAttribute('data-pd-empty')).toBe('true'));

    // 选中容器即插入上下文：点击 input-text 插入容器内并选中新节点
    fireEvent.click(document.querySelector('[data-palette-item="input-text"]')!);
    await waitFor(() => expect(anchors().length).toBe(3));

    await waitFor(() => expect(container.getAttribute('data-pd-empty')).toBeNull());
    expect(container.getAttribute('data-pd-empty-label')).toBeNull();
    expect(container.style.minHeight).toBe('');
  });
});

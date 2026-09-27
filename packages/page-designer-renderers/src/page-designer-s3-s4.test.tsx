/**
 * S3/S4 组装页叙事测试：键盘漫游（方向键/Delete 走命令通道）、数据 tab
 * （数据源清单 + 绑定编辑落文档）、模板画廊（保存/实例化=importDocument）、
 * formula 适配器在 inspector 的换装与 expr-invalid 纪律。
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageDesigner } from './page-designer-page.js';

afterEach(cleanup);

async function openDesigner() {
  const view = render(<PageDesigner />);
  await waitFor(() => expect(view.getByTestId('page-designer-canvas')).toBeTruthy());
  await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
  return view;
}

function canvasAnchors(): HTMLElement[] {
  return [...document.querySelectorAll('[data-psid]')];
}

function exportedText(): string {
  return (screen.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement).value;
}

function selectCanvasNode(anchor: HTMLElement) {
  const elementsFromPoint = document.elementsFromPoint;
  document.elementsFromPoint = () => [anchor];
  try {
    fireEvent.pointerDown(screen.getByTestId('page-designer-canvas'));
  } finally {
    document.elementsFromPoint = elementsFromPoint;
  }
}

describe('PageDesigner S3/S4 assembly', () => {
  it('data tab lists host-injected sources and the binding editor writes via updateProps', async () => {
    const view = render(<PageDesigner dataSourceNames={['users']} />);
    await waitFor(() => expect(view.getByTestId('page-designer-canvas')).toBeTruthy());
    await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());

    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(canvasAnchors().length).toBe(2));

    // 导入一份带 text 的文档（palette 落节点后换导入面，保持叙事独立）。
    fireEvent.click(screen.getByText('JSON 源码'));
    const textarea = screen.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify({
          type: 'page',
          body: [{ type: 'text', name: 'label1', text: 'x' }],
        }),
      },
    });
    fireEvent.click(screen.getByTestId('page-designer-import-json'));
    await waitFor(() =>
      expect(screen.getByTestId('page-designer-source-message').getAttribute('data-message-level')).toBe('ok'),
    );

    // 数据 tab：宿主注入的数据源清单 + 选中节点绑定编辑。
    fireEvent.click(screen.getByText('数据'));
    await waitFor(() =>
      expect(view.getAllByTestId('page-designer-data-source-name').map((el) => el.textContent)).toEqual(['users']),
    );

    // 选中文本节点（结构树）→ 数据绑定面板填写 source/field → 导出含绑定。
    fireEvent.click(screen.getByText('大纲树'));
    fireEvent.click(document.querySelector('[data-tree-node-type="text"]')!);
    fireEvent.click(screen.getByText('数据'));
    // 面板同时挂接左栏数据 tab 与 inspector 数据绑定区，取任一实例驱动。
    fireEvent.change(view.getAllByLabelText('数据源名称')[0], { target: { value: 'users' } });
    fireEvent.change(view.getAllByLabelText('字段路径')[0], { target: { value: 'name' } });

    fireEvent.click(screen.getByText('JSON 源码'));
    expect(exportedText()).toContain('"value": "${users.name}"');
  });

  it('keyboard navigation moves selection and Delete dispatches removeNode', async () => {
    await openDesigner();
    fireEvent.click(document.querySelector('[data-palette-item="container"]')!);
    await waitFor(() => expect(canvasAnchors().length).toBe(2));
    // 容器内插入一个 text（palette 点击落入选中容器的第一个 region）。
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(canvasAnchors().length).toBe(3));

    // 选中根节点（第一个锚点）→ ArrowDown 移动到 container。
    selectCanvasNode(canvasAnchors()[0]);
    await waitFor(() => expect(document.querySelector('[data-inspector-field="breadcrumb"]')).toBeTruthy());
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    // ArrowRight 进入 container 的第一个子节点（text）→ inspector 出现 text 契约字段。
    await waitFor(() => expect(document.querySelector('[data-inspector-field="tag"]')).toBeTruthy());

    // ArrowLeft 回到 container → Delete 删除（removeNode 命令）。
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(canvasAnchors().length).toBe(1));
  });

  it('formula adapter mounts for expression editorType props with expr-invalid discipline', async () => {
    const view = await openDesigner();
    selectCanvasNode(canvasAnchors()[0]);
    const host = await waitFor(() => {
      const el = document.querySelector('[data-inspector-field="breadcrumb"][data-inspector-adapter="expression"]');
      if (!el) throw new Error('adapter field not mounted yet');
      return el;
    });
    const cellTextarea = host.querySelector('textarea') as HTMLTextAreaElement;

    fireEvent.change(cellTextarea, { target: { value: '${nav.title +}' } });
    await waitFor(() => expect(view.getByTestId('page-designer-formula-error')).toBeTruthy());
    fireEvent.click(screen.getByText('JSON 源码'));
    expect(exportedText()).not.toContain('nav.title');

    fireEvent.click(screen.getByText('属性'));
    const cellAgain = document.querySelector(
      '[data-inspector-field="breadcrumb"] textarea',
    ) as HTMLTextAreaElement;
    fireEvent.change(cellAgain, { target: { value: '${nav.title}' } });
    fireEvent.click(screen.getByText('JSON 源码'));
    expect(exportedText()).toContain('"breadcrumb": "${nav.title}"');
  });

  it('template gallery saves the current page and instantiation restores it via importDocument', async () => {
    const view = await openDesigner();
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(canvasAnchors().length).toBe(2));

    fireEvent.click(view.getByTestId('page-designer-templates'));
    const dialog = await waitFor(() => {
      const el = view.getByTestId('page-designer-template-gallery');
      if (!el) throw new Error('gallery not open');
      return el;
    });
    void dialog;
    fireEvent.change(view.getByLabelText('模板名称'), { target: { value: '快照模板' } });
    fireEvent.click(view.getByTestId('page-designer-template-save'));
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));

    // 删除画布节点（清空文档），再实例化模板 → 节点恢复。先关闭画廊（焦点在输入框时 Delete 被忽略）。
    fireEvent.click(view.getByTestId('page-designer-template-close'));
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(canvasAnchors().length).toBe(1));
    fireEvent.click(view.getByTestId('page-designer-templates'));
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));
    fireEvent.click(view.getByTestId('page-designer-template-instantiate'));
    await waitFor(() => expect(canvasAnchors().length).toBe(2));

    // 导出含模板内容且无 sid（INV-E）。
    fireEvent.click(screen.getByText('JSON 源码'));
    expect(exportedText()).toContain('"type": "text"');
    expect(exportedText()).not.toContain('xui:sid');
  });
});

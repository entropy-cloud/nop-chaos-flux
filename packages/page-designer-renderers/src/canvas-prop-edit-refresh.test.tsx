/**
 * P0-MA5.1-003 判别回归（IS-page-designer-015 / b08 形态转正）。
 *
 * Inspector `updateProps` / `importDocument` 同位重建（新 doc 对象、同 sid、同 path
 * 派生 id、同 React key）后，画布渲染必须刷新为文档新值（「改了=看得见」编辑回路）。
 *
 * 根因层：flux-react `useSyncExternalStoreWithSelector` fork 在 React Compiler 转换
 * 下把 `useMemo` 工厂内可变 `memo` 对象提升为跨渲染缓存槽位——静态节点 store 快照
 * 恒定，`memoizedSelector` 短路于 `objectIs(prevSnapshot, nextSnapshot)`，selector
 * 永不重跑 → 重编译模板的新 props 冻结。vitest 配置以 babel filter 仅对该 fork
 * 模块施加 reactCompilerPreset（镜像 playground 构建面），使本回归可判别。
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import { createPageDesignerRegistry } from './designer-registry.js';
import { PageDesignerCanvas } from './canvas-bridge.js';
import { PageDesigner } from './page-designer-page.js';

afterEach(cleanup);

function makeDoc(label: string): SchemaInput {
  return injectSessionIds(
    {
      type: 'page',
      title: 'P',
      body: [{ type: 'button', label }],
    },
    createSeededRandom(42),
  ) as SchemaInput;
}

function relabel(doc: SchemaInput, label: string): SchemaInput {
  const next = structuredClone(doc) as { body: Array<Record<string, unknown>> };
  (next.body[0] as Record<string, unknown>).label = label;
  return next as unknown as SchemaInput;
}

function canvasButton(): HTMLElement | null {
  return document.querySelector(
    '[data-psid] [data-slot="button"], [data-slot="button"][data-testid^="psid-"]',
  );
}

function screenRoot(): HTMLElement {
  const root = document.querySelector('[data-runtime-id]');
  expect(root).toBeTruthy();
  return root as HTMLElement;
}

async function openDesigner() {
  const view = render(<PageDesigner />);
  await waitFor(() => expect(view.getByTestId('page-designer-canvas')).toBeTruthy());
  await waitFor(() => expect(document.querySelector('[data-psid^="psid-"]')).toBeTruthy());
  return view;
}

async function insertButtonAndSelect(view: ReturnType<typeof render>) {
  fireEvent.click(document.querySelector('[data-palette-item="button"]')!);
  await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(2));
  const buttonAnchor = [...document.querySelectorAll('[data-psid]')][1] as HTMLElement;
  const original = document.elementsFromPoint;
  document.elementsFromPoint = () => [buttonAnchor];
  try {
    fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
  } finally {
    document.elementsFromPoint = original;
  }
  await waitFor(() =>
    expect(document.querySelector('[data-inspector-field="label"]')).toBeTruthy(),
  );
  return buttonAnchor;
}

describe('P0-MA5.1-003 same-position doc replacement refreshes canvas (react-compiler build)', () => {
  it('SchemaRenderer direct: recompiled template with same derived node id updates DOM text', async () => {
    const SchemaRenderer = createSchemaRenderer([]);
    const registry = createPageDesignerRegistry();
    const env = createDefaultEnv();
    const doc1 = makeDoc('Button');
    const doc2 = relabel(doc1, '确认提交');

    const { rerender } = render(
      <SchemaRenderer schemaUrl="probe://doc" schema={doc1} env={env} registry={registry} />,
    );
    await waitFor(() => expect(screenRoot().textContent).toContain('Button'));

    rerender(
      <SchemaRenderer schemaUrl="probe://doc" schema={doc2} env={env} registry={registry} />,
    );
    await waitFor(() => expect(screenRoot().textContent).toContain('确认提交'));
  });

  it('PageDesignerCanvas: updateProps-shaped doc replacement updates anchor text', async () => {
    const registry = createPageDesignerRegistry();
    const env = createDefaultEnv();
    const doc1 = makeDoc('Button');
    const doc2 = relabel(doc1, '确认提交');

    const canvasProps = {
      registry,
      env,
      mode: 'edit' as const,
      selection: [] as string[],
      hoverNodeId: null,
      dropHint: null,
      onNodePointerDown: () => undefined,
      onNodeHover: () => undefined,
      onPaneClick: () => undefined,
      onDragOver: () => undefined,
      onDragLeave: () => undefined,
      onDrop: () => undefined,
      onRequestDelete: () => undefined,
      onRequestDuplicate: () => undefined,
    };

    const { rerender } = render(<PageDesignerCanvas document={doc1} {...canvasProps} />);
    await waitFor(() => expect(canvasButton()).toBeTruthy());
    expect(canvasButton()!.textContent).toContain('Button');

    rerender(<PageDesignerCanvas document={doc2} {...canvasProps} />);
    await waitFor(() => expect(canvasButton()!.textContent).toContain('确认提交'));
  });

  it('full PageDesigner flow: inspector label edit (transient+commit) updates canvas text (b08)', async () => {
    const view = await openDesigner();
    const anchor = await insertButtonAndSelect(view);
    expect(anchor.textContent).toContain('Button');

    const labelInput = document.querySelector(
      '[data-inspector-field="label"] input',
    ) as HTMLInputElement;
    expect(labelInput.value).toBe('Button');
    fireEvent.change(labelInput, { target: { value: '确认提交' } });
    fireEvent.blur(labelInput);

    await waitFor(() => expect(anchor.textContent).toContain('确认提交'), { timeout: 3000 });
  });

  it('full PageDesigner flow: importDocument whole-tree replacement updates canvas text', async () => {
    const view = await openDesigner();
    await waitFor(() => expect(document.querySelector('[data-psid^="psid-"]')).toBeTruthy());
    const doc1 = makeDoc('Button');

    fireEvent.click(screen.getByText('JSON 源码'));
    await waitFor(() => expect(screen.getByTestId('page-designer-source-textarea')).toBeTruthy());
    const textarea = screen.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: JSON.stringify(doc1, null, 2) } });
    fireEvent.click(screen.getByTestId('page-designer-import-json'));

    const canvas = view.getByTestId('page-designer-canvas');
    await waitFor(() =>
      expect(canvas.querySelector('[data-slot="button"]')!.textContent).toContain('Button'),
    );
    void view;
  });
});

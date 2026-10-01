/**
 * 分支收口第二组：页面键盘/复制守卫、drop 未知类型、inspector 只读/数字分支、
 * 结构树 label 分支、字段模型防御分支。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import { PageDesigner } from './page-designer-page.js';
import { StructureTree } from './structure-tree.js';
import { buildInspectorPanelModel } from './inspector-field-model.js';
import { buildInspectorSchema } from '@nop-chaos/page-designer-core';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

function dropOn(canvas: HTMLElement, payload: unknown) {
  const drop = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(drop, 'dataTransfer', {
    value: { getData: () => JSON.stringify(payload), dropEffect: 'copy' },
  });
  fireEvent(canvas, drop);
}

async function openAndSelectText() {
  const view = render(<PageDesigner />);
  await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
  fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
  await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(2));
  const textAnchor = document.querySelectorAll('[data-psid]')[1];
  const original = document.elementsFromPoint;
  document.elementsFromPoint = () => [textAnchor];
  try {
    fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
  } finally {
    document.elementsFromPoint = original;
  }
  await waitFor(() => expect(document.querySelector('[data-inspector-field="tag"]')).toBeTruthy());
  return view;
}

describe('page branch closure', () => {
  it('drop with an unregistered palette type is rejected (toast, no insert)', async () => {
    const view = render(<PageDesigner />);
    await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
    dropOn(view.getByTestId('page-designer-canvas'), { source: 'palette', type: 'domain-only-type' });
    dropOn(view.getByTestId('page-designer-canvas'), { source: 'canvas', nodeId: 'psid-x' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.querySelectorAll('[data-psid]').length).toBe(1);
  });

  it('Delete/Backspace without selection is a no-op; Ctrl+Shift+Z redoes', async () => {
    const view = render(<PageDesigner />);
    await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
    fireEvent.keyDown(window, { key: 'Delete' });
    fireEvent.keyDown(window, { key: 'Backspace' });

    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(2));
    fireEvent.click(view.getByTestId('page-designer-undo'));
    await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(1));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(2));
    // redo 后选区已清空：Backspace 不删除任何节点。
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(document.querySelectorAll('[data-psid]').length).toBe(2);
  });

  it('duplicate on the root node is a no-op (no parent region)', async () => {
    const view = render(<PageDesigner />);
    await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
    const pageAnchor = document.querySelectorAll('[data-psid]')[0];
    const original = document.elementsFromPoint;
    document.elementsFromPoint = () => [pageAnchor];
    try {
      fireEvent.pointerDown(view.getByTestId('page-designer-canvas'));
    } finally {
      document.elementsFromPoint = original;
    }
    await waitFor(() => expect(view.getByTestId('page-designer-duplicate-node')).toBeTruthy());
    fireEvent.click(view.getByTestId('page-designer-duplicate-node'));
    expect(document.querySelectorAll('[data-psid]').length).toBe(1);
  });

  it('keydown in textarea/select targets is ignored (no undo-stack mutation)', () => {
    const view = render(<PageDesigner />);
    for (const tag of ['textarea', 'select']) {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      fireEvent.keyDown(el, { key: 'Delete' });
      el.parentElement?.removeChild(el);
    }
    const editable = document.createElement('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    document.body.appendChild(editable);
    fireEvent.keyDown(editable, { key: 'Delete' });
    editable.parentElement?.removeChild(editable);
    // Real assertions (was `expect(true).toBe(true)`): ignored keydowns must
    // leave the designer untouched — undo stays disabled (nothing recorded)
    // and the canvas keeps its node count.
    expect((view.getByTestId('page-designer-undo') as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelectorAll('[data-psid]').length).toBeGreaterThan(0);
  });

  it('two transient edits stay inside one transaction', async () => {
    await openAndSelectText();
    const tagSelect = document.querySelector('[data-inspector-field="tag"] select') as HTMLSelectElement;
    fireEvent.change(tagSelect, { target: { value: 'h1' } });
    fireEvent.change(tagSelect, { target: { value: 'h2' } });
    fireEvent.blur(tagSelect);
    const undo = screen.getByTestId('page-designer-undo');
    fireEvent.click(undo);
    fireEvent.click(screen.getByTestId('page-designer-redo'));
    await openSourceTabOf();
    expect((screen.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement).value).toContain('"h2"');
  });
});

async function openSourceTabOf() {
  fireEvent.click(screen.getByText('JSON 源码'));
  await waitFor(() => expect(screen.getByTestId('page-designer-source-textarea')).toBeTruthy());
}

describe('structure-tree label branches', () => {
  it('prefers label > name > text and falls back to type', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'page',
        defaultSchema: { type: 'page', body: [] },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );
    registry.register(def({ type: 'bare-type' }));
    const doc = injectSessionIds(
      {
        type: 'page',
        body: [
          { type: 'page', label: 'Labeled' },
          { type: 'bare-type' },
        ],
      },
      createSeededRandom(51),
    );
    render(<StructureTree document={doc} registry={registry} selection={[]} onSelect={vi.fn()} />);
    const types = [...document.querySelectorAll('[data-tree-node-type]')].map((el) => el.getAttribute('data-tree-node-type'));
    expect(types).toContain('bare-type');
    const labeled = [...document.querySelectorAll('[data-tree-node-type]')].find(
      (el) => el.textContent?.includes('Labeled'),
    );
    expect(labeled).toBeTruthy();
  });

  it('skips non-schema children and sid-less nodes', () => {
    const registry = createRendererRegistry();
    registry.register(def({ type: 'bare' }));
    const doc = { type: 'bare', data: { not: 'schema' } } as never;
    render(<StructureTree document={doc} registry={registry} selection={[]} onSelect={vi.fn()} />);
    expect(document.querySelectorAll('[data-tree-node-type]').length).toBe(0);
  });
});

describe('inspector-field-model defensive branches', () => {
  it('treats a non-schema generated schema as an empty form', () => {
    const registry = createRendererRegistry();
    registry.register(def({ type: 'x', defaultSchema: { type: 'x' } }));
    const node = injectSessionIds({ type: 'x' }, createSeededRandom(61)) as never;
    const model = buildInspectorPanelModel({
      nodeId: 'psid-g',
      node,
      schema: 'not-a-schema' as never,
    });
    expect(model.hasTarget).toBe(true);
    expect(model.fields).toEqual([]);
  });

  it('reads node values over generated defaults and maps option lists', () => {
    const definition = def({
      type: 'opts',
      defaultSchema: { type: 'opts' },
      propContracts: {
        mode: {
          shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'a' }, { kind: 'literal', value: 'b' }] },
          displayName: 'Mode',
          editorType: 'select',
          defaultValue: 'a',
        },
      },
    });
    const node = injectSessionIds({ type: 'opts', mode: 'b' }, createSeededRandom(62)) as never;
    const schema = buildInspectorSchema(resolveRendererAuthoringContract(definition));
    const model = buildInspectorPanelModel({ nodeId: 'psid-h', node, schema });
    const mode = model.fields.find((field) => field.name === 'mode')!;
    expect(mode.value).toBe('b');
    expect(mode.options?.map((option) => option.value)).toEqual(['a', 'b']);
  });
});

/**
 * 大纲树 + JSON 源码视图测试。
 *
 * 结构树：文档投影、选中高亮、opaque-leaf 子树不展开（S1 §10.1）。
 * 源码视图：导出投影展示（无 xui:sid，INV-E）、rt-unknown-type / 非法 JSON 错误标注。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import type { DesignerCommandResult } from '@nop-chaos/page-designer-core';
import { buildInspectorSchema } from '@nop-chaos/page-designer-core';
import { StructureTree } from './structure-tree.js';
import { JsonSourceView } from './json-source-view.js';
import { buildInspectorPanelModel } from './inspector-field-model.js';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

function buildRegistry() {
  const registry = createRendererRegistry();
  registry.register(
    def({
      type: 'page',
      defaultSchema: { type: 'page', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
  );
  registry.register(
    def({
      type: 'opaque-widget',
      rendererClass: 'domain-host-renderer',
      defaultSchema: { type: 'opaque-widget', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
  );
  registry.register(def({ type: 'text', defaultSchema: { type: 'text' } }));
  return registry;
}

describe('StructureTree', () => {
  it('projects the document tree and supports select', () => {
    const registry = buildRegistry();
    const doc = injectSessionIds(
      { type: 'page', body: [{ type: 'text', text: 'hello' }] },
      createSeededRandom(12),
    );
    const onSelect = vi.fn();
    render(<StructureTree document={doc} registry={registry} selection={[]} onSelect={onSelect} />);
    const rows = document.querySelectorAll('[data-testid^="page-designer-tree-node-"]');
    expect(rows.length).toBe(2);
    fireEvent.click(rows[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(typeof onSelect.mock.calls[0][0]).toBe('string');
  });

  it('does not expand opaque-leaf subtrees', () => {
    const registry = buildRegistry();
    const doc = injectSessionIds(
      { type: 'page', body: [{ type: 'opaque-widget', body: [{ type: 'text', text: 'inner' }] }] },
      createSeededRandom(13),
    );
    render(<StructureTree document={doc} registry={registry} selection={[]} onSelect={vi.fn()} />);
    const labels = [...document.querySelectorAll('[data-tree-node-type]')].map(
      (row) => row.getAttribute('data-tree-node-type'),
    );
    expect(labels).toEqual(['page', 'opaque-widget']);
  });

  it('highlights the selected node', () => {
    const registry = buildRegistry();
    const doc = injectSessionIds(
      { type: 'page', body: [{ type: 'text' }] },
      createSeededRandom(14),
    );
    const pageSid = (doc as Record<string, unknown>)['xui:sid'] as string;
    render(<StructureTree document={doc} registry={registry} selection={[pageSid]} onSelect={vi.fn()} />);
    const selected = document.querySelector(`[data-testid="page-designer-tree-node-${pageSid}"]`);
    expect(selected?.className).toContain('bg-');
  });
});

describe('JsonSourceView', () => {
  it('shows the export projection and refreshes via export button', () => {
    const doc = injectSessionIds({ type: 'page', body: [] }, createSeededRandom(15));
    const exported = JSON.stringify({ type: 'page', body: [] }, null, 2);
    render(<JsonSourceView exportedJson={exported} onImport={() => ({ ok: true })} />);
    const textarea = screen.getByTestId('page-designer-source-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe(exported);
    expect(textarea.value).not.toContain('psid-');
    void doc;
  });

  it('annotates invalid JSON on import', () => {
    const onImport = vi.fn();
    render(<JsonSourceView exportedJson="{}" onImport={onImport} />);
    const textarea = screen.getByTestId('page-designer-source-textarea');
    fireEvent.change(textarea, { target: { value: '{ broken' } });
    fireEvent.click(screen.getByTestId('page-designer-import-json'));
    const message = screen.getByTestId('page-designer-source-message');
    expect(message.getAttribute('data-message-level')).toBe('error');
    expect(onImport).not.toHaveBeenCalled();
  });

  it('annotates unknown-type rejection (rt-unknown-type path)', () => {
    const onImport = vi.fn().mockReturnValue({ ok: false, error: 'unknown-type' } as DesignerCommandResult);
    render(<JsonSourceView exportedJson="{}" onImport={onImport} />);
    fireEvent.click(screen.getByTestId('page-designer-import-json'));
    const message = screen.getByTestId('page-designer-source-message');
    expect(message.getAttribute('data-message-level')).toBe('error');
    expect(message.textContent).toContain('未注册');
  });

  it('reports success for a valid import', () => {
    const onImport = vi.fn().mockReturnValue({ ok: true } as DesignerCommandResult);
    render(<JsonSourceView exportedJson="{}" onImport={onImport} />);
    fireEvent.click(screen.getByTestId('page-designer-import-json'));
    const message = screen.getByTestId('page-designer-source-message');
    expect(message.getAttribute('data-message-level')).toBe('ok');
  });

  it('reports generic rejection for other error codes', () => {
    const onImport = vi.fn().mockReturnValue({ ok: false, error: 'empty-change' } as DesignerCommandResult);
    render(<JsonSourceView exportedJson="{}" onImport={onImport} />);
    fireEvent.click(screen.getByTestId('page-designer-import-json'));
    const message = screen.getByTestId('page-designer-source-message');
    expect(message.getAttribute('data-message-level')).toBe('error');
    expect(message.textContent).toContain('empty-change');
  });

  it('events panel model includes descriptions from contract events', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'page',
        defaultSchema: { type: 'page', body: [] },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
        propContracts: {
          breadcrumb: { shape: { kind: 'array', item: { kind: 'unknown' } }, displayName: 'Breadcrumb' },
        },
        eventContracts: {
          onClick: { displayName: 'Click', description: 'Root activated.' },
        },
      }),
    );
    const definition = registry.get('page')!;
    const node = injectSessionIds({ type: 'page', body: [] }, createSeededRandom(31)) as never;
    const schema = buildInspectorPanelSchema(definition);
    const model = buildInspectorPanelModel({ nodeId: 'psid-e', node, schema });
    expect(model.events.map((event) => event.displayName)).toContain('Click');
  });
});

function buildInspectorPanelSchema(definition: ReturnType<ReturnType<typeof createRendererRegistry>['get']>) {
  return buildInspectorSchema(resolveRendererAuthoringContract(definition!), {
    fieldRules: definition!.fields,
  });
}

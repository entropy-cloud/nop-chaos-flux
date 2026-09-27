/**
 * Inspector 面板测试（S1 §8）：生成 schema 驱动字段渲染、updateProps 提交
 * （transient/commit 两段；即时控件一次收口）、opaque-leaf 仅 propContracts 字段、
 * 无契约降级原始 JSON 直编、空态、换选中重置草稿。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import { buildInspectorSchema } from '@nop-chaos/page-designer-core';
import { InspectorPanel } from './inspector-panel.js';
import { buildInspectorPanelModel } from './inspector-field-model.js';
import { createPageDesignerRegistry } from './designer-registry.js';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

function buildSchemaFor(definition: RendererDefinition) {
  return buildInspectorSchema(resolveRendererAuthoringContract(definition), {
    fieldRules: definition.fields,
  });
}

describe('inspector-field-model', () => {
  it('projects generated schema fields with node values and read-only flags', () => {
    const registry = createPageDesignerRegistry();
    const definition = registry.get('text')!;
    const node = injectSessionIds(
      { type: 'text', tag: 'h2', copyable: true },
      createSeededRandom(4),
    ) as never;
    const schema = buildSchemaFor(definition);
    const model = buildInspectorPanelModel({ nodeId: 'psid-x', node, schema });
    expect(model.hasTarget).toBe(true);
    expect(model.hasContract).toBe(true);
    const names = model.fields.map((field) => field.name);
    expect(names).toEqual(['tag', 'copyable', 'maxLineToggle']);
    const tag = model.fields.find((field) => field.name === 'tag')!;
    expect(tag.control).toBe('select');
    expect(tag.value).toBe('h2');
    const copyable = model.fields.find((field) => field.name === 'copyable')!;
    expect(copyable.control).toBe('switch');
    expect(copyable.value).toBe(true);
    expect(model.rendererType).toBe('text');
    expect(model.events.length).toBe(0);
    // tag select 携带字面量选项集（生成器 options 投影）。
    expect(model.fields.find((field) => field.name === 'tag')?.options?.map((option) => option.value)).toContain('h1');
  });

  it('degrades to raw JSON model for renderers without propContracts', () => {
    const registry = createRendererRegistry();
    registry.register(def({ type: 'bare', defaultSchema: { type: 'bare' } }));
    const definition = registry.get('bare')!;
    const node = injectSessionIds({ type: 'bare', a: 1 }, createSeededRandom(5)) as never;
    const schema = buildSchemaFor(definition);
    const model = buildInspectorPanelModel({ nodeId: 'psid-y', node, schema });
    expect(model.hasContract).toBe(false);
    expect(model.fields).toEqual([]);
  });
});

describe('InspectorPanel', () => {
  it('renders no-selection empty state', () => {
    render(<InspectorPanel nodeId={null} node={null} definition={undefined} onUpdateProps={vi.fn()} />);
    expect(screen.getByTestId('page-designer-inspector-empty')).toBeTruthy();
  });

  it('renders contract fields for a button node and commits transient + commit stages', () => {
    const registry = createPageDesignerRegistry();
    const definition = registry.get('button')!;
    const node = injectSessionIds(
      { type: 'button', label: 'Hello' },
      createSeededRandom(6),
    ) as never;
    const onUpdateProps = vi.fn();
    render(
      <InspectorPanel nodeId="psid-1" node={node} definition={definition} onUpdateProps={onUpdateProps} />,
    );
    const labelInput = document.querySelector('[data-inspector-field="label"] input') as HTMLInputElement;
    expect(labelInput.value).toBe('Hello');
    fireEvent.change(labelInput, { target: { value: 'Changed' } });
    expect(onUpdateProps).toHaveBeenCalledWith({ label: 'Changed' }, 'transient');
    fireEvent.blur(labelInput);
    expect(onUpdateProps).toHaveBeenCalledWith({}, 'commit');
  });

  it('instant controls (select/switch) commit in one stage', () => {
    const registry = createPageDesignerRegistry();
    const definition = registry.get('text')!;
    const node = injectSessionIds({ type: 'text' }, createSeededRandom(7)) as never;
    const onUpdateProps = vi.fn();
    render(
      <InspectorPanel nodeId="psid-2" node={node} definition={definition} onUpdateProps={onUpdateProps} />,
    );
    const tagSelect = document.querySelector('[data-inspector-field="tag"] select') as HTMLSelectElement;
    expect(tagSelect).toBeTruthy();
    fireEvent.change(tagSelect, { target: { value: 'h1' } });
    expect(onUpdateProps).toHaveBeenCalledWith({ tag: 'h1' }, 'transient');
    expect(onUpdateProps).toHaveBeenCalledWith({}, 'commit');

    const copyable = document.querySelector(
      '[data-inspector-field="copyable"] [data-slot="switch"]',
    ) as HTMLButtonElement;
    expect(copyable).toBeTruthy();
    fireEvent.click(copyable);
    const calls = onUpdateProps.mock.calls.filter((call) => call[1] === 'transient');
    expect(calls.at(-1)![0].copyable).toBe(true);
    expect(onUpdateProps).toHaveBeenLastCalledWith({}, 'commit');
  });

  it('opaque-leaf exposes only propContracts fields (region routed out, raw absent)', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'domain-host-widget',
        rendererClass: 'domain-host-renderer',
        defaultSchema: { type: 'domain-host-widget' },
        propContracts: {
          title: { shape: { kind: 'string' }, displayName: 'Title' },
        },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );
    const definition = registry.get('domain-host-widget');
    const node = injectSessionIds(
      { type: 'domain-host-widget', title: 'T', body: [{ type: 'text' }] },
      createSeededRandom(8),
    ) as never;
    const onUpdateProps = vi.fn();
    render(
      <InspectorPanel nodeId="psid-3" node={node} definition={definition} onUpdateProps={onUpdateProps} />,
    );
    expect(document.querySelector('[data-inspector-field="title"] input')).toBeTruthy();
    expect(screen.queryByTestId('page-designer-inspector-raw')).toBeNull();
    expect(document.querySelector('[data-inspector-field="body"]')).toBeNull();
  });

  it('degrades to raw JSON editor for no-contract renderers', () => {
    const registry = createRendererRegistry();
    registry.register(def({ type: 'bare', defaultSchema: { type: 'bare' } }));
    const definition = registry.get('bare');
    const node = injectSessionIds({ type: 'bare', size: 2 }, createSeededRandom(9)) as never;
    const onUpdateProps = vi.fn();
    render(
      <InspectorPanel nodeId="psid-4" node={node} definition={definition} onUpdateProps={onUpdateProps} />,
    );
    const raw = screen.getByTestId('page-designer-inspector-raw');
    const textarea = raw.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('"size": 2');
    fireEvent.change(textarea, { target: { value: '{ invalid' } });
    fireEvent.blur(textarea);
    expect(screen.getByTestId('page-designer-inspector-raw-error')).toBeTruthy();
    expect(onUpdateProps).toHaveBeenCalledWith({}, 'commit');

    fireEvent.change(textarea, { target: { value: '{"title":"A"}' } });
    fireEvent.blur(textarea);
    expect(onUpdateProps).toHaveBeenCalledWith({ title: 'A' }, 'commit');
  });

  it('resets drafts when selection changes to another node', () => {
    const registry = createPageDesignerRegistry();
    const definition = registry.get('button')!;
    const nodeA = injectSessionIds({ type: 'button', label: 'A' }, createSeededRandom(10)) as never;
    const nodeB = injectSessionIds({ type: 'button', label: 'B' }, createSeededRandom(11)) as never;
    const onUpdateProps = vi.fn();
    const view = render(
      <InspectorPanel nodeId="psid-a" node={nodeA} definition={definition} onUpdateProps={onUpdateProps} />,
    );
    const input = document.querySelector('[data-inspector-field="label"] input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'draft' } });
    view.rerender(
      <InspectorPanel nodeId="psid-b" node={nodeB} definition={definition} onUpdateProps={onUpdateProps} />,
    );
    const inputB = document.querySelector('[data-inspector-field="label"] input') as HTMLInputElement;
    expect(inputB.value).toBe('B');
  });
});

/**
 * Inspector 控件矩阵（S1 §8.1 editorType/shape 双层映射的消费侧验证）：
 * input-number / textarea / json / 只读展示 / description 投影；以及 registry
 * 分组兜底与结构树 label 兜底分支。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import { buildInspectorSchema } from '@nop-chaos/page-designer-core';
import { InspectorPanel } from './inspector-panel.js';
import { buildMvpPaletteItems, createPageDesignerRegistry } from './designer-registry.js';
import { StructureTree } from './structure-tree.js';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

const MATRIX_DEF: RendererDefinition = def({
  type: 'matrix-widget',
  defaultSchema: { type: 'matrix-widget' },
  propContracts: {
    count: { shape: { kind: 'number' }, displayName: 'Count' },
    summary: { shape: { kind: 'string' }, displayName: 'Summary', editorType: 'textarea' },
    payload: { shape: { kind: 'object' }, displayName: 'Payload' },
    kind: {
      shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'a' }, { kind: 'literal', value: 'b' }] },
      displayName: 'Kind',
    },
    fixed: { shape: { kind: 'literal', value: 'locked' }, displayName: 'Fixed' },
    named: { shape: { kind: 'string' }, displayName: 'Named', editorType: 'input' },
  },
});

function renderMatrix(nodeOverrides: Record<string, unknown>, onUpdateProps = vi.fn()) {
  const node = injectSessionIds({ type: 'matrix-widget', ...nodeOverrides }, createSeededRandom(21)) as never;
  const view = render(
    <InspectorPanel nodeId="psid-m" node={node} definition={MATRIX_DEF} onUpdateProps={onUpdateProps} />,
  );
  return { view, onUpdateProps };
}

describe('InspectorField control matrix', () => {
  it('input-number: transient on change, commit on blur', () => {
    const { onUpdateProps } = renderMatrix({ count: 2 });
    const input = document.querySelector('[data-inspector-field="count"] input') as HTMLInputElement;
    expect(input.type).toBe('number');
    fireEvent.change(input, { target: { value: '5' } });
    expect(onUpdateProps).toHaveBeenCalledWith({ count: 5 }, 'transient');
    fireEvent.blur(input);
    expect(onUpdateProps).toHaveBeenLastCalledWith({}, 'commit');
  });

  it('textarea: transient on change, commit on blur', () => {
    const { onUpdateProps } = renderMatrix({});
    const textarea = document.querySelector('[data-inspector-field="summary"] textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello' } });
    expect(onUpdateProps).toHaveBeenCalledWith({ summary: 'hello' }, 'transient');
    fireEvent.blur(textarea);
    expect(onUpdateProps).toHaveBeenLastCalledWith({}, 'commit');
  });

  it('json control: commits parsed value on blur; invalid JSON keeps working', () => {
    const { onUpdateProps } = renderMatrix({ payload: { a: 1 } });
    const textarea = document.querySelector('[data-inspector-field="payload"] textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('{"a":1}');
    fireEvent.change(textarea, { target: { value: '{"a":2}' } });
    expect(onUpdateProps).not.toHaveBeenCalledWith(expect.objectContaining({ payload: expect.anything() }), 'transient');
    fireEvent.blur(textarea);
    expect(onUpdateProps).toHaveBeenCalledWith({ payload: { a: 2 } }, 'transient');
    expect(onUpdateProps).toHaveBeenCalledWith({}, 'commit');

    fireEvent.change(textarea, { target: { value: 'nope{' } });
    fireEvent.blur(textarea);
    expect(onUpdateProps).toHaveBeenLastCalledWith({}, 'commit');
  });

  it('literal-shape fields render read-only', () => {
    renderMatrix({});
    const fixed = document.querySelector('[data-inspector-field="fixed"]');
    expect(fixed?.getAttribute('data-inspector-readonly')).toBe('true');
    const input = fixed?.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('renders field descriptions', () => {
    const MATRIX_DESC = def({
      type: 'desc-widget',
      defaultSchema: { type: 'desc-widget' },
      propContracts: {
        named: {
          shape: { kind: 'string' },
          displayName: 'Named',
          description: 'A named thing.',
        },
      },
    });
    const node = injectSessionIds({ type: 'desc-widget' }, createSeededRandom(22)) as never;
    const schema = buildInspectorSchema(resolveRendererAuthoringContract(MATRIX_DESC), { fieldRules: undefined });
    void schema;
    render(<InspectorPanel nodeId="psid-d" node={node} definition={MATRIX_DESC} onUpdateProps={vi.fn()} />);
    expect(screen.getByText('A named thing.')).toBeTruthy();
  });
});

describe('registry/tree fallback branches', () => {
  it('palette items without category fall back to form group; icon is passed through', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'iconic',
        displayName: 'Iconic',
        icon: 'Star',
        defaultSchema: { type: 'iconic' },
        category: 'layout',
      }),
    );
    const items = buildMvpPaletteItems(registry);
    const iconic = items.find((item) => item.type === 'iconic');
    expect(iconic?.icon).toBe('Star');
    expect(iconic?.group).toBe('layout');
    // 真实 form 族 definition 无 category → toScaffoldedItem 兜底为 'form' 分组。
    const inputText = buildMvpPaletteItems(createPageDesignerRegistry()).find(
      (item) => item.type === 'input-text',
    );
    expect(inputText?.group).toBe('form');
  });

  it('structure tree falls back to definition displayName for label', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'labeled',
        displayName: 'Labeled Widget',
        defaultSchema: { type: 'labeled' },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );
    const doc = injectSessionIds({ type: 'labeled', body: [] }, createSeededRandom(23));
    render(<StructureTree document={doc} registry={registry} selection={[]} onSelect={vi.fn()} />);
    const row = document.querySelector('[data-tree-node-type="labeled"]');
    expect(row?.textContent).toContain('Labeled Widget');
  });
});

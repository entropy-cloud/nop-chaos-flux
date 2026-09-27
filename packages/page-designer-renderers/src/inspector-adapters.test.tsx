/**
 * formula 编辑器适配器 + inspector 挂接测试（S3-3）：adapter 命中位换装、
 * 合法值 transient 落文档、非法值行内错误且不落文档、blur 收口。
 */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import { createFormulaExpressionAdapter } from './inspector-adapters.js';
import { InspectorPanel } from './inspector-panel.js';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

const EXPRESSION_PROP_DEFINITION = def({
  type: 'expr-widget',
  propContracts: {
    breadcrumb: {
      shape: { kind: 'string' },
      displayName: 'Breadcrumb',
      editorType: 'expression',
    },
  },
});

describe('createFormulaExpressionAdapter', () => {
  it('renders a cell that forwards valid values and commits on blur', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const adapter = createFormulaExpressionAdapter();
    const view = render(
      <div>{adapter.renderCell({ value: '${users.name}', onChange, onCommit, fieldId: 'f1', fieldLabel: 'Breadcrumb' })}</div>,
    );
    const textarea = view.getByTestId('page-designer-formula-cell').querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('${users.name}');
    fireEvent.change(textarea, { target: { value: '${users.tag}' } });
    expect(onChange).toHaveBeenCalledWith('${users.tag}');
    expect(view.getByTestId('page-designer-formula-cell').getAttribute('data-formula-state')).toBe('valid');
    fireEvent.blur(textarea);
    expect(onCommit).toHaveBeenCalled();
  });

  it('shows an inline error for invalid expressions and does not call onChange', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const adapter = createFormulaExpressionAdapter();
    const view = render(
      <div>{adapter.renderCell({ value: '', onChange, onCommit })}</div>,
    );
    const textarea = view.getByTestId('page-designer-formula-cell').querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '${oops +}' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(view.getByTestId('page-designer-formula-error').textContent).toMatch(/表达式不合法/);
    expect(view.getByTestId('page-designer-formula-cell').getAttribute('data-formula-state')).toBe('invalid');
  });
});

describe('InspectorPanel adapter mounting', () => {
  function renderInspector(onUpdateProps: (props: Record<string, unknown>, stage: 'transient' | 'commit') => void) {
    const definition = EXPRESSION_PROP_DEFINITION;
    const node = injectSessionIds({ type: 'expr-widget' }, createSeededRandom(8)) as never;
    return render(
      <InspectorPanel
        nodeId="psid-1"
        node={node}
        definition={definition}
        controlAdapters={{ expression: createFormulaExpressionAdapter() }}
        onUpdateProps={onUpdateProps}
      />,
    );
  }

  it('replaces the adapter-marked field with the formula cell and routes transient/commit', () => {
    const onUpdateProps = vi.fn();
    const view = renderInspector(onUpdateProps);
    const host = document.querySelector('[data-inspector-field="breadcrumb"]') as HTMLElement;
    expect(host).toBeTruthy();
    expect(host.getAttribute('data-inspector-adapter')).toBe('expression');
    const textarea = host.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '${nav.title}' } });
    expect(onUpdateProps).toHaveBeenCalledWith({ breadcrumb: '${nav.title}' }, 'transient');
    fireEvent.blur(textarea);
    expect(onUpdateProps).toHaveBeenCalledWith({}, 'commit');
    void view;
  });

  it('blocks invalid expression writes at the panel boundary', () => {
    const onUpdateProps = vi.fn();
    const view = renderInspector(onUpdateProps);
    const textarea = document.querySelector('[data-inspector-field="breadcrumb"] textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '${oops +}' } });
    expect(onUpdateProps).not.toHaveBeenCalledWith(expect.objectContaining({ breadcrumb: '${oops +}' }), 'transient');
    expect(view.getByTestId('page-designer-formula-error')).toBeTruthy();
  });
});

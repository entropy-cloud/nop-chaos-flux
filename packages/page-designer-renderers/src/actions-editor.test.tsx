/**
 * 动作编排面板测试（S3-2）：新增/编辑行、动作类型换装、未知类型标注保留、
 * 参数键值对增删、顺序移动、删除行；写回经 onUpdateProps（transient/commit）。
 */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionsEditorPanel } from './actions-editor.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

afterEach(cleanup);

function node(actions: unknown): BaseSchema {
  return { type: 'button', label: 'Go', ...(actions !== undefined ? { 'xui:actions': actions } : {}) } as unknown as BaseSchema;
}

/**
 * 收敛宿主：面板写回 → 宿主应用 updateProps → 节点 prop 更新（真实宿主契约）。
 * 同时记录全部 (props, stage) 调用供断言。
 */
function renderConverging(initial: unknown, calls: { props: Record<string, unknown>; stage: string }[] = []) {
  function Harness() {
    const [actions, setActions] = useState(initial);
    const current = node(actions);
    return (
      <ActionsEditorPanel
        node={current}
        onUpdateProps={(props, stage) => {
          calls.push({ props, stage });
          // 真实宿主契约：commit 阶段只收口事务、忽略 mutation。
          if (stage === 'transient' && Object.keys(props).length > 0) {
            setActions(props['xui:actions']);
          }
        }}
      />
    );
  }
  return render(<Harness />);
}

describe('ActionsEditorPanel', () => {
  it('renders empty state and adds a row via structural commit', () => {
    const onUpdateProps = vi.fn();
    const view = render(<ActionsEditorPanel node={node(undefined)} onUpdateProps={onUpdateProps} />);
    expect(view.getByTestId('page-designer-actions-empty')).toBeTruthy();
    fireEvent.click(view.getByTestId('page-designer-action-add'));
    // 结构操作 = transient 携带变更（宿主 dispatch）+ 空 commit（收口 1 undo 步）。
    expect(onUpdateProps).toHaveBeenNthCalledWith(
      1,
      { 'xui:actions': { action1: { action: 'ajax' } } },
      'transient',
    );
    expect(onUpdateProps).toHaveBeenNthCalledWith(2, {}, 'commit');
  });

  it('projects existing rows; row edit is transient, blur commits, type change commits', () => {
    const calls: { props: Record<string, unknown>; stage: string }[] = [];
    const view = renderConverging({ greet: { action: 'showToast', args: { message: 'hi' } } }, calls);
    const row = view.getByTestId('page-designer-action-row');
    expect(row.getAttribute('data-action-known')).toBe('true');

    const mutations = () => calls.filter((call) => Object.keys(call.props).length > 0);
    const commits = () => calls.filter(
      (call) => call.stage === 'commit' && Object.keys(call.props).length === 0,
    );

    // 换选中后行集收敛重投影（宿主应用了写回 → recordJson 归位 → uid 稳定）。
    const nameInput = view.getByTestId('page-designer-action-name-0') as HTMLInputElement;
    expect(nameInput.value).toBe('greet');
    fireEvent.change(nameInput, { target: { value: 'greet2' } });
    expect(mutations().at(-1)).toEqual({
      props: { 'xui:actions': { greet2: { action: 'showToast', args: { message: 'hi' } } } },
      stage: 'transient',
    });
    // 收敛后行集保持稳定（输入框不重挂，受控值来自宿主态）。
    expect((view.getByTestId('page-designer-action-name-0') as HTMLInputElement).value).toBe('greet2');
    fireEvent.blur(view.getByTestId('page-designer-action-name-0'));
    // blur 收口 = 空变更 commit（宿主 endTransaction）。
    expect(commits().length).toBeGreaterThanOrEqual(1);

    const typeSelect = document.querySelector('[data-testid="page-designer-action-type-0"]') as HTMLSelectElement;
    expect(typeSelect.value).toBe('showToast');
    fireEvent.change(typeSelect, { target: { value: 'navigate' } });
    // 结构操作 = transient 变更 + 立即空 commit（1 条 undo 步）。
    expect(mutations().at(-1)).toEqual({
      props: { 'xui:actions': { greet2: { action: 'navigate', args: { message: 'hi' } } } },
      stage: 'transient',
    });
    expect(commits().at(-1)).toEqual({ props: {}, stage: 'commit' });
  });

  it('non-converging host still receives transient row edits', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <ActionsEditorPanel
        node={node({ greet: { action: 'showToast', args: { message: 'hi' } } })}
        onUpdateProps={onUpdateProps}
      />,
    );
    const nameInput = view.getByTestId('page-designer-action-name-0') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'greet2' } });
    expect(onUpdateProps).toHaveBeenLastCalledWith(
      { 'xui:actions': { greet2: { action: 'showToast', args: { message: 'hi' } } } },
      'transient',
    );
  });

  it('marks unknown action types and preserves them on write-back', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <ActionsEditorPanel
        node={node({ portal: { action: 'teleport', when: '${open}' } })}
        onUpdateProps={onUpdateProps}
      />,
    );
    const row = view.getByTestId('page-designer-action-row');
    expect(row.getAttribute('data-action-known')).toBe('false');
    expect(view.getByTestId('page-designer-action-unknown-0')).toBeTruthy();
    const typeSelect = view.getByTestId('page-designer-action-type-0') as HTMLSelectElement;
    expect(typeSelect.value).toBe('teleport');
    // 未知类型在下拉中保留为标注选项。
    expect([...typeSelect.options].some((option) => option.value === 'teleport')).toBe(true);
    expect(view.getByText('保留字段：when')).toBeTruthy();
  });

  it('adds and removes arg pairs with JSON-normalized values (converging host)', () => {
    const calls: { props: Record<string, unknown>; stage: string }[] = [];
    const view = renderConverging({ a1: { action: 'ajax' } }, calls);
    fireEvent.click(view.getByTestId('page-designer-action-arg-add-0'));
    const key = view.getByLabelText('参数名') as HTMLInputElement;
    const value = view.getByLabelText('参数值') as HTMLInputElement;
    fireEvent.change(key, { target: { value: 'url' } });
    fireEvent.change(value, { target: { value: '/api' } });
    expect(calls.at(-1)).toEqual({
      props: { 'xui:actions': { a1: { action: 'ajax', args: { url: '/api' } } } },
      stage: 'transient',
    });
    // 收敛后输入框保持挂载，受控值来自宿主态（args 容器内第 2 个输入 = 值）。
    const valueAgain = [...document.querySelectorAll('[data-testid="page-designer-action-args-0"] input')][1] as HTMLInputElement;
    expect(valueAgain.value).toBe('/api');
    fireEvent.change(valueAgain, { target: { value: '123' } });
    expect(calls.at(-1)).toEqual({
      props: { 'xui:actions': { a1: { action: 'ajax', args: { url: 123 } } } },
      stage: 'transient',
    });

    fireEvent.click(view.getByTestId('page-designer-action-arg-remove-0-0'));
    // 唯一参数被移除 → args 整键省略（结构操作：transient 变更 + 空 commit）。
    const mutations = () => calls.filter((call) => Object.keys(call.props).length > 0);
    expect(mutations().at(-1)).toEqual({
      props: { 'xui:actions': { a1: { action: 'ajax' } } },
      stage: 'transient',
    });
  });

  it('moves rows up/down and removes rows via structural commits', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <ActionsEditorPanel
        node={node({ first: { action: 'ajax' }, second: { action: 'alert' } })}
        onUpdateProps={onUpdateProps}
      />,
    );
    const mutations = () =>
      onUpdateProps.mock.calls.filter(
        (call) => call[1] === 'transient' && Object.keys(call[0] as object).length > 0,
      );
    fireEvent.click(view.getByTestId('page-designer-action-down-0'));
    expect(mutations().at(-1)?.[0]).toEqual({
      'xui:actions': { second: { action: 'alert' }, first: { action: 'ajax' } },
    });
    fireEvent.click(view.getByTestId('page-designer-action-up-1'));
    expect(mutations().at(-1)?.[0]).toEqual({
      'xui:actions': { first: { action: 'ajax' }, second: { action: 'alert' } },
    });
    fireEvent.click(view.getByTestId('page-designer-action-remove-0'));
    expect(mutations().at(-1)?.[0]).toEqual({ 'xui:actions': { second: { action: 'alert' } } });
  });

  it('renders read-only preserved state for non-record xui:actions', () => {
    const onUpdateProps = vi.fn();
    const view = render(<ActionsEditorPanel node={node('bogus')} onUpdateProps={onUpdateProps} />);
    expect(view.getByTestId('page-designer-actions-preserved')).toBeTruthy();
    expect(view.queryByTestId('page-designer-action-add')).toBeNull();
  });

  it('removes the key entirely after the last row is deleted', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <ActionsEditorPanel node={node({ only: { action: 'ajax' } })} onUpdateProps={onUpdateProps} />,
    );
    fireEvent.click(view.getByTestId('page-designer-action-remove-0'));
    expect(onUpdateProps).toHaveBeenNthCalledWith(1, { 'xui:actions': undefined }, 'transient');
    expect(onUpdateProps).toHaveBeenNthCalledWith(2, {}, 'commit');
  });
});

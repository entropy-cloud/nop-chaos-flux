import React from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BindingEditorField,
  StateEditorField,
  bindingsToRows,
  rowsToBindings,
  statesToDraft,
  draftToStates,
} from './binding-panel.js';

afterEach(() => {
  cleanup();
});

const queryTestId = (container: HTMLElement, id: string): Element | null =>
  container.querySelector(`[data-testid="${id}"]`);

describe('bindingsToRows / rowsToBindings (pure)', () => {
  it('derives mode from declaration (expression wins over point)', () => {
    const rows = bindingsToRows({
      fill: { point: 'p1' },
      text: { expression: '${v}', point: 'ignored' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ property: 'fill', mode: 'point', point: 'p1' });
    expect(rows[1]).toMatchObject({ property: 'text', mode: 'expression', expression: '${v}' });
    // rowKey 稳定唯一（react/no-array-index-key 的替代键，由 bindingsToRows 生成）。
    expect(new Set(rows.map((r) => r.rowKey)).size).toBe(rows.length);
  });

  it('round-trips advanced keys (map/scale/format) through advancedText', () => {
    const source = { opacity: { point: 'p1', scale: { k: 2 }, format: '%d', map: { a: 'b' } } };
    const rows = bindingsToRows(source);
    const { bindings, advancedErrors } = rowsToBindings(rows);
    expect(advancedErrors.size).toBe(0);
    expect(bindings.opacity).toEqual(source.opacity);
  });

  it('skips empty-property and none-mode rows; writes point/exclusion exclusively', () => {
    const result = rowsToBindings([
      { rowKey: 'r3', property: '', mode: 'point', point: 'p1', expression: '', advancedText: '' },
      { rowKey: 'r4', property: 'fill', mode: 'none', point: 'p1', expression: 'x', advancedText: '' },
      { rowKey: 'r5', property: 'text', mode: 'point', point: ' live ', expression: 'should-not-write', advancedText: '' },
      { rowKey: 'r6', property: 'visible', mode: 'expression', point: 'should-not-write', expression: '${ok}', advancedText: '' },
    ]);
    expect(result.advancedErrors.size).toBe(0);
    expect(Object.keys(result.bindings).sort()).toEqual(['text', 'visible']);
    expect(result.bindings.text).toEqual({ point: 'live' });
    expect(result.bindings.visible).toEqual({ expression: '${ok}' });
  });

  it('isolates invalid advanced JSON per row without blocking valid rows', () => {
    const result = rowsToBindings([
      { rowKey: 'r7', property: 'fill', mode: 'point', point: 'p1', expression: '', advancedText: '{not json' },
      { rowKey: 'r8', property: 'text', mode: 'point', point: 'p2', expression: '', advancedText: '{"format":"%s"}' },
      { rowKey: 'r9', property: 'opacity', mode: 'point', point: 'p3', expression: '', advancedText: '[1,2]' },
    ]);
    expect(result.advancedErrors.get(0)).toBe('parse');
    expect(result.advancedErrors.get(2)).toBe('object');
    expect(result.bindings.fill).toEqual({ point: 'p1' });
    expect(result.bindings.text).toEqual({ point: 'p2', format: '%s' });
  });

  it('treats null/primitive binding values as mode=none rows with empty text fields', () => {
    const rows = bindingsToRows({ broken: null, scalar: 'red', hollow: {} });
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.mode).toBe('none');
      expect(row.point).toBe('');
      expect(row.expression).toBe('');
      expect(row.advancedText).toBe('');
    }
    // null/primitive 行不产出任何声明（rowsToBindings 跳过 none 行）。
    const { bindings } = rowsToBindings(rows);
    expect(bindings).toEqual({});
  });

  it('flags JSON-null advanced text as an object error (parse succeeds but value is not an object)', () => {
    const result = rowsToBindings([
      { rowKey: 'r13', property: 'fill', mode: 'point', point: 'p1', expression: '', advancedText: 'null' },
    ]);
    expect(result.advancedErrors.get(0)).toBe('object');
    expect(result.bindings.fill).toEqual({ point: 'p1' });
  });
});

describe('statesToDraft / draftToStates (pure)', () => {
  it('round-trips a full declaration', () => {
    const source = {
      states: { run: { style: { fill: '#0f0' } }, stop: { animations: [{ kind: 'blink' as const }] } },
      stateSource: 'p1',
      booleanMap: { true: 'run', false: 'stop' },
      ranges: [{ min: 0, state: 'run' }],
      valueMap: { '1': 'run' },
    };
    const draft = statesToDraft(source);
    expect(draft.stateSource).toBe('p1');
    expect(draft.stateRows.map((r) => r.key).sort()).toEqual(['run', 'stop']);
    const { states, defErrors, advancedError } = draftToStates(draft);
    expect(defErrors.size).toBe(0);
    expect(advancedError).toBeUndefined();
    expect(states).toEqual(source);
  });

  it('returns undefined when draft is fully empty (clears node.states)', () => {
    const { states } = draftToStates({
      stateSource: '',
      stateRows: [],
      booleanTrue: '',
      booleanFalse: '',
      advancedText: '',
    });
    expect(states).toBeUndefined();
  });

  it('records def parse errors per key and skips failed rows', () => {
    const { states, defErrors } = draftToStates({
      stateSource: '',
      stateRows: [
        { rowKey: 'r10', key: 'ok', defText: '{"style":{"fill":"#f00"}}' },
        { rowKey: 'r11', key: 'bad', defText: '{oops' },
        { rowKey: 'r12', key: 'arr', defText: '[1]' },
      ],
      booleanTrue: '',
      booleanFalse: '',
      advancedText: '',
    });
    expect(defErrors.get('bad')).toBe('parse');
    expect(defErrors.get('arr')).toBe('object');
    expect(Object.keys(states?.states ?? {})).toEqual(['ok']);
  });

  it('flags JSON-null state definitions as object errors without dropping valid rows', () => {
    const { states, defErrors } = draftToStates({
      stateSource: '',
      stateRows: [
        { rowKey: 'r14', key: 'nullDef', defText: 'null' },
        { rowKey: 'r15', key: 'ok', defText: '{"style":{"fill":"#0f0"}}' },
      ],
      booleanTrue: '',
      booleanFalse: '',
      advancedText: '',
    });
    expect(defErrors.get('nullDef')).toBe('object');
    expect(Object.keys(states?.states ?? {})).toEqual(['ok']);
  });

  it('surfaces advanced object errors (valid JSON, non-object value) and keeps other declarations', () => {
    const result = draftToStates({
      stateSource: 'p1',
      stateRows: [],
      booleanTrue: 'run',
      booleanFalse: 'stop',
      advancedText: '[1,2]',
    });
    expect(result.advancedError).toBe('object');
    expect(result.states?.stateSource).toBe('p1');
    expect(result.states?.booleanMap).toEqual({ true: 'run', false: 'stop' });
    // 非 object 高级键不写入声明。
    expect(result.states?.ranges).toBeUndefined();
    expect(result.states?.valueMap).toBeUndefined();
  });

  it('omits booleanMap unless both sides present; surfaces advanced error', () => {
    const partial = draftToStates({
      stateSource: 'p1',
      stateRows: [],
      booleanTrue: 'run',
      booleanFalse: '',
      advancedText: '',
    });
    expect(partial.states?.booleanMap).toBeUndefined();
    expect(partial.states?.stateSource).toBe('p1');
    const badAdvanced = draftToStates({
      stateSource: '',
      stateRows: [],
      booleanTrue: '',
      booleanFalse: '',
      advancedText: 'nope',
    });
    expect(badAdvanced.advancedError).toBe('parse');
  });
});

describe('BindingEditorField (component)', () => {
  it('commits a point binding row and flags unknown point ids', () => {
    const onChange = vi.fn();
    const { getByTestId, container } = render(
      <BindingEditorField value={undefined} pointIds={['p1']} onChange={onChange} />,
    );
    fireEvent.click(getByTestId('binding-editor-add-row'));
    expect(onChange).toHaveBeenLastCalledWith(undefined);

    fireEvent.change(getByTestId('binding-row-0-property'), { target: { value: 'fill' } });
    fireEvent.change(getByTestId('binding-row-0-mode'), { target: { value: 'point' } });
    const pointInput = getByTestId('binding-row-0-point');
    fireEvent.change(pointInput, { target: { value: 'unknown-point' } });
    expect(getByTestId('binding-row-0-unknown-point')).toBeTruthy();

    fireEvent.change(pointInput, { target: { value: 'p1' } });
    expect(queryTestId(container, 'binding-row-0-unknown-point')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({ fill: { point: 'p1' } });
  });

  it('separates expression textarea from point input (mutual exclusion at declaration level)', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <BindingEditorField value={{ fill: { point: 'p1' } }} pointIds={['p1']} onChange={onChange} />,
    );
    // Existing point binding renders point row.
    expect(getByTestId('binding-row-0-point')).toBeTruthy();
    fireEvent.change(getByTestId('binding-row-0-mode'), { target: { value: 'expression' } });
    fireEvent.change(getByTestId('binding-row-0-expression'), { target: { value: '${v * 2}' } });
    expect(onChange).toHaveBeenLastCalledWith({ fill: { expression: '${v * 2}' } });
  });

  it('removes rows and keeps invalid advanced JSON out of the committed declaration', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <BindingEditorField value={undefined} pointIds={['p1']} onChange={onChange} />,
    );
    fireEvent.click(getByTestId('binding-editor-add-row'));
    fireEvent.change(getByTestId('binding-row-0-property'), { target: { value: 'text' } });
    fireEvent.change(getByTestId('binding-row-0-mode'), { target: { value: 'point' } });
    fireEvent.change(getByTestId('binding-row-0-point'), { target: { value: 'p1' } });
    fireEvent.change(getByTestId('binding-row-0-advanced'), { target: { value: '{bad' } });
    const last = onChange.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(last).toEqual({ text: { point: 'p1' } });
    // 行级高级 JSON 错误就地可见（不阻塞其他行）。
    expect(document.querySelector('.nop-scada-editor-field-error')).toBeTruthy();
  });

  it('renders the field-level error and appends out-of-list properties as select options', () => {
    const onChange = vi.fn();
    const { container } = render(
      <BindingEditorField
        value={{ customProp: { point: 'p1' } }}
        pointIds={['p1']}
        onChange={onChange}
        error="bad bindings"
      />,
    );
    expect(container.textContent).toContain('bad bindings');
    // 非 BINDABLE_PROPERTIES 的既有扩展 key 回显进选项集。
    expect(container.querySelector('option[value="customProp"]')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rebuilds rows when the external value changes, and keeps the draft across self-update echoes', () => {
    const onChange = vi.fn();
    const view = render(<BindingEditorField value={{ fill: { point: 'p1' } }} pointIds={['p1']} onChange={onChange} />);
    const rowBefore = document.querySelector('[data-slot="scada-editor-binding-row"]');
    // 外部值变化（非本组件提交）→ 行重建（property 回显为新值）。
    view.rerender(<BindingEditorField value={{ stroke: { point: 'p2' } }} pointIds={['p1']} onChange={onChange} />);
    expect((view.getByTestId('binding-row-0-property') as HTMLSelectElement).value).toBe('stroke');
    expect(document.querySelector('[data-slot="scada-editor-binding-row"]')).not.toBe(rowBefore);

    // 本组件提交 → 外部回填同一值（selfUpdate 命中）→ 行不重建（rowKey 稳定，DOM 复用）。
    fireEvent.change(view.getByTestId('binding-row-0-mode'), { target: { value: 'point' } });
    fireEvent.change(view.getByTestId('binding-row-0-point'), { target: { value: 'p2' } });
    expect(onChange).toHaveBeenLastCalledWith({ stroke: { point: 'p2' } });
    const rowBeforeEcho = document.querySelector('[data-slot="scada-editor-binding-row"]');
    view.rerender(<BindingEditorField value={{ stroke: { point: 'p2' } }} pointIds={['p1']} onChange={onChange} />);
    expect(document.querySelector('[data-slot="scada-editor-binding-row"]')).toBe(rowBeforeEcho);
  });

  it('patches only the edited row when multiple rows exist', () => {
    const onChange = vi.fn();
    const { getByTestId, getAllByTestId } = render(
      <BindingEditorField value={undefined} pointIds={['p1']} onChange={onChange} />,
    );
    fireEvent.click(getByTestId('binding-editor-add-row'));
    fireEvent.click(getByTestId('binding-editor-add-row'));
    expect(getAllByTestId(/binding-row-\d+-property$/)).toHaveLength(2);
    fireEvent.change(getByTestId('binding-row-1-property'), { target: { value: 'stroke' } });
    fireEvent.change(getByTestId('binding-row-1-mode'), { target: { value: 'point' } });
    fireEvent.change(getByTestId('binding-row-1-point'), { target: { value: 'p1' } });
    // 未编辑的第 0 行保持 mode=none → 不产出声明；仅第 1 行入库。
    expect(onChange).toHaveBeenLastCalledWith({ stroke: { point: 'p1' } });
  });
});

describe('StateEditorField (component)', () => {
  it('commits stateSource and structured state rows', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <StateEditorField value={undefined} pointIds={['tank']} onChange={onChange} />,
    );
    fireEvent.change(getByTestId('state-editor-state-source'), { target: { value: 'tank' } });
    expect(onChange).toHaveBeenLastCalledWith({ states: {}, stateSource: 'tank' });

    fireEvent.click(getByTestId('state-editor-add-row'));
    fireEvent.change(getByTestId('state-row-0-key'), { target: { value: 'run' } });
    fireEvent.change(getByTestId('state-row-0-def'), { target: { value: '{"style":{"fill":"#0f0"}}' } });
    const last = onChange.mock.calls.at(-1)![0] as {
      states: Record<string, unknown>;
      stateSource: string;
    };
    expect(last.states.run).toEqual({ style: { fill: '#0f0' } });
    expect(last.stateSource).toBe('tank');
  });

  it('shows unknown-point hint for stateSource outside declared variables', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <StateEditorField value={undefined} pointIds={[]} onChange={onChange} />,
    );
    fireEvent.change(getByTestId('state-editor-state-source'), { target: { value: 'ghost.point' } });
    expect(getByTestId('state-editor-unknown-point')).toBeTruthy();
  });

  it('flags invalid state definition JSON without blocking other declarations', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <StateEditorField value={undefined} pointIds={['p1']} onChange={onChange} />,
    );
    fireEvent.click(getByTestId('state-editor-add-row'));
    fireEvent.change(getByTestId('state-row-0-key'), { target: { value: 'bad' } });
    fireEvent.change(getByTestId('state-row-0-def'), { target: { value: '{nope' } });
    fireEvent.change(getByTestId('state-editor-state-source'), { target: { value: 'p1' } });
    const last = onChange.mock.calls.at(-1)![0] as { states: Record<string, unknown>; stateSource: string };
    expect(last.states.bad).toBeUndefined();
    expect(last.stateSource).toBe('p1');
    // 行级 def JSON 错误就地可见。
    expect(document.querySelector('.nop-scada-editor-field-error')).toBeTruthy();
  });

  it('renders the field-level error and commits booleanMap once both sides are present', () => {
    const onChange = vi.fn();
    const { getByTestId, container } = render(
      <StateEditorField value={undefined} pointIds={['p1']} onChange={onChange} error="bad states" />,
    );
    expect(container.textContent).toContain('bad states');
    fireEvent.change(getByTestId('state-editor-boolean-true'), { target: { value: 'run' } });
    // 仅一侧 → booleanMap 不写入。
    expect(onChange).toHaveBeenLastCalledWith({ states: {} });
    fireEvent.change(getByTestId('state-editor-boolean-false'), { target: { value: 'stop' } });
    expect(onChange).toHaveBeenLastCalledWith({ states: {}, booleanMap: { true: 'run', false: 'stop' } });
    fireEvent.change(getByTestId('state-editor-advanced'), { target: { value: '{bad' } });
    // 高级 JSON 错误就地可见，且不把坏值写进声明。
    expect(container.textContent).toContain('bad states');
    const errNodes = container.querySelectorAll('.nop-scada-editor-field-error');
    expect(errNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('rebuilds the draft when the external value changes, and keeps it across self-update echoes', () => {
    const onChange = vi.fn();
    const source = { states: { run: { style: { fill: '#0f0' } } } };
    const view = render(<StateEditorField value={source} pointIds={['p1']} onChange={onChange} />);
    // 外部值变化 → draft 重建（stateSource/stateRows 回显新值）。
    const next = { states: { stop: { style: { fill: '#f00' } } }, stateSource: 'p9' };
    view.rerender(<StateEditorField value={next} pointIds={['p1']} onChange={onChange} />);
    expect((view.getByTestId('state-editor-state-source') as HTMLInputElement).value).toBe('p9');
    expect((view.getByTestId('state-row-0-key') as HTMLInputElement).value).toBe('stop');

    // 本组件提交 → 外部回填同一值（selfUpdate 命中）→ draft 不重建（行 DOM 复用）。
    fireEvent.change(view.getByTestId('state-row-0-key'), { target: { value: 'halt' } });
    expect(onChange).toHaveBeenLastCalledWith({ states: { halt: { style: { fill: '#f00' } } }, stateSource: 'p9' });
    const rowBeforeEcho = document.querySelector('[data-slot="scada-editor-state-row"]');
    view.rerender(
      <StateEditorField
        value={{ states: { halt: { style: { fill: '#f00' } } }, stateSource: 'p9' }}
        pointIds={['p1']}
        onChange={onChange}
      />,
    );
    expect(document.querySelector('[data-slot="scada-editor-state-row"]')).toBe(rowBeforeEcho);
  });

  it('patches only the edited row and removes the targeted row when multiple rows exist', () => {
    const onChange = vi.fn();
    const { getByTestId, getAllByTestId } = render(
      <StateEditorField value={undefined} pointIds={['p1']} onChange={onChange} />,
    );
    fireEvent.click(getByTestId('state-editor-add-row'));
    fireEvent.click(getByTestId('state-editor-add-row'));
    expect(getAllByTestId(/state-row-\d+-key$/)).toHaveLength(2);
    // 编辑第 1 行：未编辑的第 0 行经 map 的非命中分支原样保留。
    fireEvent.change(getByTestId('state-row-1-key'), { target: { value: 'run' } });
    fireEvent.change(getByTestId('state-row-1-def'), { target: { value: '{"style":{"fill":"#00f"}}' } });
    let last = onChange.mock.calls.at(-1)![0] as { states: Record<string, unknown> };
    expect(last.states).toEqual({ run: { style: { fill: '#00f' } } });
    // 删除第 0 行：仅第 1 行存活，键名保持。
    fireEvent.click(getByTestId('state-row-0-remove'));
    last = onChange.mock.calls.at(-1)![0] as { states: Record<string, unknown> };
    expect(Object.keys(last.states)).toEqual(['run']);
    expect(getAllByTestId(/state-row-\d+-key$/)).toHaveLength(1);
  });
});

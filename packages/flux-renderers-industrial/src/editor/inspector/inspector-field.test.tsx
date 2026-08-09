import React from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InspectorField } from './inspector-field.js';
import type { PanelField } from './schema-extractor.js';

afterEach(() => {
  cleanup();
});

function makeField(overrides: Partial<PanelField['entry']> & { key?: string }): PanelField {
  return {
    key: overrides.widget === 'readonly' ? 'id' : 'test',
    entry: { type: 'string', widget: 'text-input', ...overrides },
    defaultValue: undefined,
  };
}

describe('InspectorField widget rendering', () => {
  it('renders number-input widget', () => {
    const field = makeField({ type: 'number', widget: 'number-input' });
    const { container } = render(<InspectorField field={field} value={42} onChange={() => undefined} />);
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('42');
  });

  it('renders switch widget', () => {
    const field = makeField({ type: 'boolean', widget: 'switch' });
    const { container } = render(<InspectorField field={field} value={true} onChange={() => undefined} />);
    // Switch renders a button or role=switch element
    expect(container.querySelector('[role="switch"]') ?? container.querySelector('button')).toBeTruthy();
  });

  it('renders text-input widget (default)', () => {
    const field = makeField({ type: 'string', widget: 'text-input' });
    const { container } = render(<InspectorField field={field} value="hello" onChange={() => undefined} />);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('hello');
  });

  it('renders color-picker widget', () => {
    const field = makeField({ type: 'string', widget: 'color-picker' });
    const { container } = render(<InspectorField field={field} value="#ff0000" onChange={() => undefined} />);
    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    expect(input).toBeTruthy();
  });

  it('renders json-editor widget', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    const { container } = render(<InspectorField field={field} value={{ a: 1 }} onChange={() => undefined} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea?.value).toContain('"a"');
  });

  it('renders json-editor with string value', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    const { container } = render(<InspectorField field={field} value="invalid json" onChange={() => undefined} />);
    const textarea = container.querySelector('textarea');
    expect(textarea?.value).toBe('invalid json');
  });

  it('renders select widget with enum', () => {
    const field = makeField({ type: 'string', widget: 'select', enum: ['a', 'b', 'c'] });
    const { container } = render(<InspectorField field={field} value="b" onChange={() => undefined} />);
    // Select from @nop-chaos/ui may render a native select or a custom trigger
    expect(container.textContent).toContain('b');
  });

  it('select widget renders @nop-chaos/ui NativeSelect (E6 m-1 fix: no raw <select>)', () => {
    const field = makeField({ type: 'string', widget: 'select', enum: ['left', 'center', 'right'] });
    const { container } = render(<InspectorField field={field} value="left" onChange={() => undefined} />);
    // NativeSelect renders <select data-slot="native-select"> inside a wrapper（AGENTS.md MANDATORY UI 复用）。
    const nativeSelect = container.querySelector('[data-slot="native-select"]');
    expect(nativeSelect).toBeTruthy();
    expect(nativeSelect?.tagName).toBe('SELECT');
    // 自定 raw-select 类已移除（m-1 修正）。
    expect(container.querySelector('.nop-scada-editor-select')).toBeNull();
    // enum 选项渲染为 <option>。
    expect(container.querySelectorAll('option')).toHaveLength(3);
  });

  it('renders slider widget', () => {
    const field = makeField({ type: 'number', widget: 'slider', min: 0, max: 1 });
    const { container } = render(<InspectorField field={field} value={0.5} onChange={() => undefined} />);
    // Slider from @nop-chaos/ui (Radix-based) renders various elements
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('renders readonly widget', () => {
    const field = makeField({ type: 'string', widget: 'readonly' });
    const { container } = render(<InspectorField field={field} value="fixed-id" onChange={() => undefined} />);
    expect(container.textContent).toContain('fixed-id');
  });

  it('shows field error message when provided', () => {
    const field = makeField({ type: 'string', widget: 'text-input' });
    const { container } = render(<InspectorField field={field} value="x" error="Must be valid" onChange={() => undefined} />);
    expect(container.textContent).toContain('Must be valid');
  });

  it('number-input onChange produces number', () => {
    const field = makeField({ type: 'number', widget: 'number-input' });
    let captured: unknown;
    const { container } = render(<InspectorField field={field} value={0} onChange={(v) => { captured = v; }} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '42' } });
    expect(captured).toBe(42);
  });

  it('text-input onChange produces string', () => {
    const field = makeField({ type: 'string', widget: 'text-input' });
    let captured: unknown;
    const { container } = render(<InspectorField field={field} value="" onChange={(v) => { captured = v; }} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(captured).toBe('hello');
  });

  it('select onChange produces string value', () => {
    const field = makeField({ type: 'string', widget: 'select', enum: ['left', 'center', 'right'] });
    let captured: unknown;
    const { container } = render(<InspectorField field={field} value="left" onChange={(v) => { captured = v; }} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'center' } });
    expect(captured).toBe('center');
  });

  it('json-editor onChange parses valid JSON', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    let captured: unknown;
    const { container } = render(<InspectorField field={field} value={{ a: 1 }} onChange={(v) => { captured = v; }} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{"b": 2}' } });
    expect(captured).toEqual({ b: 2 });
  });

  // plan 2026-08-08-0900-1 Phase 1 / P2 #6：parse 失败时不写裸字符串到 workingConfig，仅显示 field-error。
  it('json-editor does NOT call onChange for invalid JSON (shows field-error instead)', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    let captured: unknown = 'UNCHANGED';
    const { container } = render(<InspectorField field={field} value={{ a: 1 }} onChange={(v) => { captured = v; }} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'not json' } });
    // onChange 未被调用（workingConfig 不被裸字符串 corrupt）。
    expect(captured).toBe('UNCHANGED');
    // 显示 field-error（含 parse 失败提示）。
    const errorEl = container.querySelector('.nop-scada-editor-field-error');
    expect(errorEl).toBeTruthy();
    // 草稿文本保留（用户可继续修正）。
    expect(textarea.value).toBe('not json');
  });

  it('json-editor clears field-error once input becomes valid JSON again', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    const { container } = render(<InspectorField field={field} value={{ a: 1 }} onChange={() => undefined} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'not json' } });
    expect(container.querySelector('.nop-scada-editor-field-error')).toBeTruthy();
    fireEvent.change(textarea, { target: { value: '{"a": 2}' } });
    expect(container.querySelector('.nop-scada-editor-field-error')).toBeNull();
  });

  it('json-editor preserves draft across rapid invalid keystrokes', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    let captured: unknown = 'INITIAL';
    const { container } = render(<InspectorField field={field} value={null} onChange={(v) => { captured = v; }} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{' } });
    expect(captured).toBe('INITIAL');
    fireEvent.change(textarea, { target: { value: '{"x"' } });
    expect(captured).toBe('INITIAL');
    fireEvent.change(textarea, { target: { value: '{"x": 1}' } });
    expect(captured).toEqual({ x: 1 });
  });

  it('json-editor syncs draft when value changes externally', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    const { container, rerender } = render(<InspectorField field={field} value={{ a: 1 }} onChange={() => undefined} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('"a"');
    rerender(<InspectorField field={field} value={{ b: 2 }} onChange={() => undefined} />);
    expect(textarea.value).toContain('"b"');
  });

  it('json-editor does not clobber draft when parent echoes back emitted value', () => {
    const field = makeField({ type: 'object', widget: 'json-editor' });
    let emitted: unknown = null;
    const { container, rerender } = render(<InspectorField field={field} value={null} onChange={(v) => { emitted = v; }} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{"x": 1}' } });
    expect(emitted).toEqual({ x: 1 });
    // parent echoes back the exact emitted reference → draft preserved (no canonical re-format clobber).
    rerender(<InspectorField field={field} value={emitted} onChange={() => undefined} />);
    expect(textarea.value).toBe('{"x": 1}');
  });

  it('color-picker onChange produces string', () => {
    const field = makeField({ type: 'string', widget: 'color-picker' });
    let captured: unknown;
    const { container } = render(<InspectorField field={field} value="#000000" onChange={(v) => { captured = v; }} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#ff0000' } });
    expect(captured).toBe('#ff0000');
  });

  it('select without enum falls back to text input', () => {
    const field = makeField({ type: 'string', widget: 'select' });
    const { container } = render(<InspectorField field={field} value="x" onChange={() => undefined} />);
    expect(container.querySelector('input')).toBeTruthy();
  });
});

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { ValueInput } from './value-input.js';
import type { ConditionField } from './types.js';

afterEach(cleanup);

const textField: ConditionField = { name: 'name', label: 'Name', type: 'text' };
const numberField: ConditionField = { name: 'age', label: 'Age', type: 'number' };

function createProjectedScope(): ScopeRef {
  const state: Record<string, unknown> = { value: 'alpha' };

  return {
    id: 'scope-1',
    path: 'page.filters.item-1',
    parent: undefined,
    store: {
      getSnapshot: () => state,
      getLastChange: () => undefined,
      setSnapshot: () => undefined,
      subscribe: () => () => undefined,
    },
    get(path: string) {
      return state[path];
    },
    has(path: string) {
      return path in state;
    },
    get value() {
      return state;
    },
    readOwn() {
      return state;
    },
    readVisible() {
      return state;
    },
    materializeVisible() {
      return state;
    },
    update(path: string, value: unknown) {
      state[path] = value;
    },
    merge(data: Record<string, unknown>) {
      Object.assign(state, data);
    },
    replace(data: Record<string, unknown>) {
      for (const key of Object.keys(state)) {
        delete state[key];
      }
      Object.assign(state, data);
    },
  } as ScopeRef;
}

describe('ValueInput', () => {
  it('returns null for empty operator', () => {
    const { container } = render(
      <ValueInput field={textField} op="" value={undefined} onChange={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null for is_empty operator', () => {
    const { container } = render(
      <ValueInput field={textField} op="is_empty" value={undefined} onChange={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null for is_not_empty operator', () => {
    const { container } = render(
      <ValueInput field={textField} op="is_not_empty" value={undefined} onChange={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders text input for text field', () => {
    const { container } = render(
      <ValueInput field={textField} op="equal" value="hello" onChange={() => {}} />,
    );
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('hello');
  });

  it('renders number input for number field', () => {
    const { container } = render(
      <ValueInput field={numberField} op="equal" value={42} onChange={() => {}} />,
    );
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('42');
  });

  it('calls onChange with undefined when number input is cleared', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ValueInput field={numberField} op="equal" value={10} onChange={onChange} />,
    );
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onChange with number when number input receives input', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ValueInput field={numberField} op="equal" value={undefined} onChange={onChange} />,
    );
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.change(input, { target: { value: '25' } });
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('renders between inputs for between operator', () => {
    const { container } = render(
      <ValueInput field={numberField} op="between" value={[10, 20]} onChange={() => {}} />,
    );
    const inputs = container.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBe(2);
  });

  it('preserves the surviving side when one between slot is cleared (H3)', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ValueInput field={numberField} op="between" value={[10, 20]} onChange={onChange} />,
    );
    const inputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[0], { target: { value: '' } });
    // Clearing start must NOT nuke the whole range to undefined; the surviving
    // end value (20) is kept in a half-range tuple (sanitizeRight keeps the
    // array as long as one side is defined).
    expect(onChange).toHaveBeenCalledWith([undefined, 20]);
  });

  it('collapses to undefined only when both between slots are cleared (H3)', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ValueInput field={numberField} op="between" value={[undefined, 20]} onChange={onChange} />,
    );
    const inputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[1], { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith([undefined, undefined]);
  });

  it('calls onChange with array when between has both values', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ValueInput field={numberField} op="between" value={[10, undefined]} onChange={onChange} />,
    );
    const inputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[1], { target: { value: '20' } });
    expect(onChange).toHaveBeenCalledWith([10, 20]);
  });

  it('calls onChange with string value for text input', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ValueInput field={textField} op="equal" value="" onChange={onChange} />,
    );
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('fails honestly when a custom field omits schema rendering support', () => {
    const customField: ConditionField = {
      name: 'roleId',
      label: 'Role',
      type: 'custom',
      value: { type: 'input-text', name: 'value', label: 'Role value' } as any,
    };

    expect(() =>
      render(
        <ValueInput
          field={customField}
          op="equal"
          value="admin"
          onChange={() => {}}
          projectedScope={createProjectedScope()}
        />,
      ),
    ).toThrow(/requires schema rendering support/i);
  });

  it('renders a custom field through the provided schema render hook', () => {
    const renderCustomSchema = vi.fn(() => <div data-testid="custom-editor">custom</div>);
    const customField: ConditionField = {
      name: 'roleId',
      label: 'Role',
      type: 'custom',
      value: { type: 'input-text', name: 'value', label: 'Role value' } as any,
    };
    const projectedScope = createProjectedScope();

    render(
      <ValueInput
        field={customField}
        op="equal"
        value="admin"
        onChange={() => {}}
        projectedScope={projectedScope}
        renderCustomSchema={renderCustomSchema}
      />,
    );

    expect(screen.getByTestId('custom-editor')).toBeTruthy();
    expect(renderCustomSchema).toHaveBeenCalledWith(
      customField.value,
      expect.objectContaining({ field: customField, op: 'equal', value: 'admin', scope: projectedScope }),
    );
  });

  it('uses NativeSelect markers for multi-select add control', () => {
    const field: ConditionField = {
      name: 'status',
      label: 'Status',
      type: 'select',
      multiple: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
    };

    const { container } = render(
      <ValueInput field={field} op="equal" value={undefined} onChange={() => {}} />,
    );

    const wrapper = container.querySelector('[data-slot="native-select-wrapper"]');
    const select = container.querySelector('[data-slot="native-select"]');

    expect(wrapper).toBeTruthy();
    expect(select).toBeTruthy();
    expect(select?.closest('[data-slot="native-select-wrapper"]')).toBe(wrapper);
  });

  it('adds and removes multi-select values', () => {
    const onChange = vi.fn();
    const field: ConditionField = {
      name: 'status',
      label: 'Status',
      type: 'select',
      multiple: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
    };

    const { container, rerender } = render(
      <ValueInput field={field} op="equal" value={undefined} onChange={onChange} />,
    );

    const select = container.querySelector('[data-slot="native-select"]');
    expect(select).toBeTruthy();

    fireEvent.change(select as HTMLSelectElement, { target: { value: 'open' } });
    expect(onChange).toHaveBeenCalledWith(['open']);

    rerender(<ValueInput field={field} op="equal" value={['open']} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove value Open' }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('uses translated placeholders after language switch', async () => {
    resetFluxI18n();
    initFluxI18n();
    await changeLanguage('en-US');

    const { container } = render(
      <ValueInput field={numberField} op="equal" value={undefined} onChange={() => {}} />,
    );
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;

    expect(input.placeholder).toBe('Number');
  });
});

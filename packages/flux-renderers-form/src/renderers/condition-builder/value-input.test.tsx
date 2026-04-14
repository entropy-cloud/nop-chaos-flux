import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { ValueInput } from './ValueInput';
import type { ConditionField } from './types';

afterEach(cleanup);

const textField: ConditionField = { name: 'name', label: 'Name', type: 'text' };
const numberField: ConditionField = { name: 'age', label: 'Age', type: 'number' };

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
    const { container } = render(<ValueInput field={textField} op="equal" value="hello" onChange={() => {}} />);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('hello');
  });

  it('renders number input for number field', () => {
    const { container } = render(<ValueInput field={numberField} op="equal" value={42} onChange={() => {}} />);
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('42');
  });

  it('calls onChange with undefined when number input is cleared', () => {
    const onChange = vi.fn();
    const { container } = render(<ValueInput field={numberField} op="equal" value={10} onChange={onChange} />);
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onChange with number when number input receives input', () => {
    const onChange = vi.fn();
    const { container } = render(<ValueInput field={numberField} op="equal" value={undefined} onChange={onChange} />);
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

  it('calls onChange with undefined when between has incomplete values', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ValueInput field={numberField} op="between" value={[10, 20]} onChange={onChange} />,
    );
    const inputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[0], { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(undefined);
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
    const { container } = render(<ValueInput field={textField} op="equal" value="" onChange={onChange} />);
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders text input as fallback for custom field type', () => {
    const customField = { name: 'x', label: 'X', type: 'custom' } as ConditionField;
    const { container } = render(<ValueInput field={customField} op="equal" value="test" onChange={() => {}} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.value).toBe('test');
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

    rerender(
      <ValueInput field={field} op="equal" value={['open']} onChange={onChange} />,
    );

    fireEvent.click(screen.getByText('Open ×'));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});

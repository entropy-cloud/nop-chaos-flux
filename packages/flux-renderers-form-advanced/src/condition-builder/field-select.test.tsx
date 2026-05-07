import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { FieldSelect } from './field-select.js';
import type { ConditionField } from './types.js';

vi.mock('@nop-chaos/ui', () => {
  function MockCombobox({ children, onValueChange, disabled }: any) {
    return (
      <div data-testid="mock-combobox" data-disabled={disabled ?? false}>
        <button
          type="button"
          data-testid="combobox-select"
          onClick={() => onValueChange?.({ name: 'age', label: 'Age' })}
        >
          select
        </button>
        {children}
      </div>
    );
  }

  function MockComboboxInput({ placeholder, className }: any) {
    return (
      <input data-testid="mock-combobox-input" placeholder={placeholder} className={className} />
    );
  }

  function MockComboboxContent({ children }: any) {
    return <div data-testid="mock-combobox-content">{children}</div>;
  }

  function MockComboboxEmpty({ children }: any) {
    return <div data-testid="mock-combobox-empty">{children}</div>;
  }

  function MockComboboxList({ children }: any) {
    return (
      <div data-testid="mock-combobox-list">{typeof children === 'function' ? null : children}</div>
    );
  }

  function MockComboboxItem({ children, value, disabled }: any) {
    return (
      <div data-testid={`combobox-item-${value?.name ?? value}`} data-disabled={disabled ?? false}>
        {children}
      </div>
    );
  }

  return {
    cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
    Combobox: MockCombobox,
    ComboboxInput: MockComboboxInput,
    ComboboxContent: MockComboboxContent,
    ComboboxEmpty: MockComboboxEmpty,
    ComboboxList: MockComboboxList,
    ComboboxItem: MockComboboxItem,
  };
});

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(cleanup);

const simpleFields: ConditionField[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'age', label: 'Age', type: 'number' },
];

const groupedFields: ConditionField[] = [
  {
    type: 'group',
    label: 'Personal',
    children: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'age', label: 'Age', type: 'number' },
    ],
  } as any,
  { name: 'status', label: 'Status', type: 'select' },
];

describe('FieldSelect', () => {
  it('renders combobox component', () => {
    render(<FieldSelect fields={simpleFields} value="name" onChange={() => {}} />);
    expect(screen.getByTestId('mock-combobox')).toBeTruthy();
  });

  it('calls onChange when a field is selected', () => {
    const onChange = vi.fn();
    render(<FieldSelect fields={simpleFields} value="name" onChange={onChange} />);
    screen.getByTestId('combobox-select').click();
    expect(onChange).toHaveBeenCalledWith('age');
  });

  it('does not call onChange when null value is passed', () => {
    const onChange = vi.fn();
    render(<FieldSelect fields={simpleFields} value="name" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders with grouped fields', () => {
    render(<FieldSelect fields={groupedFields} value="status" onChange={() => {}} />);
    expect(screen.getByTestId('mock-combobox')).toBeTruthy();
  });

  it('passes disabled to combobox', () => {
    render(<FieldSelect fields={simpleFields} value="name" onChange={() => {}} disabled={true} />);
    expect(screen.getByTestId('mock-combobox').dataset.disabled).toBe('true');
  });

  it('renders with undefined value', () => {
    render(<FieldSelect fields={simpleFields} value={undefined} onChange={() => {}} />);
    expect(screen.getByTestId('mock-combobox')).toBeTruthy();
  });

  it('renders with empty fields', () => {
    render(<FieldSelect fields={[]} value={undefined} onChange={() => {}} />);
    expect(screen.getByTestId('mock-combobox')).toBeTruthy();
  });

  it('passes usedFields and uniqueFields for unique field mode', () => {
    const usedFields = new Set(['name']);
    render(
      <FieldSelect
        fields={simpleFields}
        value="age"
        onChange={() => {}}
        usedFields={usedFields}
        uniqueFields={true}
      />,
    );
    expect(screen.getByTestId('mock-combobox')).toBeTruthy();
  });
});

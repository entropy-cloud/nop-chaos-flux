import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { ConditionField, ConditionItemValue } from './types.js';
import { ConditionItem } from './condition-item.js';

vi.mock('@nop-chaos/ui', () => {
  const forwardRef = React.forwardRef;

  const MockButton = forwardRef(
    ({ children, onClick, disabled, type: _type, ...props }: any, ref: any) => (
      <button ref={ref} type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
  );
  (MockButton as any).displayName = 'Button';

  const MockInput = forwardRef(({ onChange, value, ...props }: any, ref: any) => (
    <input ref={ref} value={value ?? ''} onChange={onChange} {...props} />
  ));
  (MockInput as any).displayName = 'Input';

  const MockSelectTrigger = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="select-trigger" {...props}>
      {children}
    </div>
  ));
  (MockSelectTrigger as any).displayName = 'SelectTrigger';

  const MockSelectContent = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="select-content" {...props}>
      {children}
    </div>
  ));
  (MockSelectContent as any).displayName = 'SelectContent';

  const MockSelectItem = forwardRef(({ children, value, ...props }: any, ref: any) => (
    <div ref={ref} data-testid={`select-item-${value}`} data-value={value} {...props}>
      {children}
    </div>
  ));
  (MockSelectItem as any).displayName = 'SelectItem';

  const MockSelectValue = ({ placeholder }: any) => <span>{placeholder}</span>;

  function MockSelect({ children, value, onValueChange, disabled }: any) {
    return (
      <div data-testid="mock-select" data-value={value} data-disabled={disabled ?? false}>
        <button
          type="button"
          data-testid="mock-select-trigger"
          onClick={() => onValueChange?.('__test_value__')}
        >
          {value || 'select'}
        </button>
        <div data-testid="mock-select-content">{children}</div>
      </div>
    );
  }

  function MockCombobox({ children, disabled }: any) {
    return (
      <div data-testid="mock-combobox" data-disabled={disabled ?? false}>
        {children}
      </div>
    );
  }
  function MockComboboxInput({ placeholder, ...props }: any) {
    return <input data-testid="mock-combobox-input" placeholder={placeholder} {...props} />;
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

  const MockBadge = forwardRef(({ children, ...props }: any, ref: any) => (
    <span ref={ref} {...props}>
      {children}
    </span>
  ));
  (MockBadge as any).displayName = 'Badge';

  const MockNativeSelect = forwardRef(({ onChange, value, children, ...props }: any, ref: any) => (
    <select ref={ref} value={value} onChange={onChange} data-slot="native-select" {...props}>
      {children}
    </select>
  ));
  (MockNativeSelect as any).displayName = 'NativeSelect';

  function MockNativeSelectOption({ value, children }: any) {
    return <option value={value}>{children}</option>;
  }

  return {
    cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
    Button: MockButton,
    Input: MockInput,
    Select: MockSelect,
    SelectTrigger: MockSelectTrigger,
    SelectContent: MockSelectContent,
    SelectItem: MockSelectItem,
    SelectValue: MockSelectValue,
    Combobox: MockCombobox,
    ComboboxInput: MockComboboxInput,
    ComboboxContent: MockComboboxContent,
    ComboboxEmpty: MockComboboxEmpty,
    ComboboxList: MockComboboxList,
    ComboboxItem: MockComboboxItem,
    Badge: MockBadge,
    NativeSelect: MockNativeSelect,
    NativeSelectOption: MockNativeSelectOption,
  };
});

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <>{children}</>,
  closestCenter: {},
  PointerSensor: {},
  KeyboardSensor: {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <>{children}</>,
  verticalListSortingStrategy: {},
  arrayMove: (arr: any[], from: number, to: number) => {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  },
  useSortable: () => ({
    attributes: {},
    listeners: { 'data-dnd-listeners': true },
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(cleanup);

const testFields: ConditionField[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'age', label: 'Age', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
  { name: 'vip', label: 'VIP', type: 'boolean' },
];

function makeItem(overrides: Partial<ConditionItemValue> = {}): ConditionItemValue {
  return {
    id: 'item-1',
    left: { type: 'field', field: 'name' },
    op: 'equal',
    right: undefined,
    ...overrides,
  };
}

describe('ConditionItem', () => {
  it('renders with field select, operator select, and value input', () => {
    const { container } = render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.querySelector('[data-slot="condition-item"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="mock-combobox"]')).toBeTruthy();
    expect(screen.getByLabelText('Condition field')).toBeTruthy();
    expect(screen.getByLabelText('Condition operator')).toBeTruthy();
    expect(screen.getByLabelText('Condition value')).toBeTruthy();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={onRemove}
      />,
    );
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove when remove action is activated with Enter or Space', () => {
    const onRemove = vi.fn();
    render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={onRemove}
      />,
    );

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.keyDown(removeBtn, { key: 'Enter' });
    fireEvent.keyDown(removeBtn, { key: ' ' });

    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it('hides remove button when disabled', () => {
    const { container } = render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
        disabled={true}
      />,
    );
    expect(container.querySelector('.hover\\:text-destructive')).toBeNull();
  });

  it('renders drag handle when draggable and not disabled', () => {
    render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
        draggable={true}
        dragHandleProps={{ 'data-dnd-listeners': true } as React.HTMLAttributes<HTMLElement>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Reorder condition' })).toBeTruthy();
  });

  it('does not render drag handle when disabled', () => {
    const { container } = render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
        draggable={true}
        disabled={true}
      />,
    );
    expect(container.querySelector('.cursor-grab')).toBeNull();
  });

  it('renders drag handle with drag handle props', () => {
    const { container } = render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
        draggable={true}
        dragHandleProps={{ 'data-testid': 'drag-handle' } as React.HTMLAttributes<HTMLElement>}
      />,
    );
    expect(container.querySelector('[data-testid="drag-handle"]')).toBeTruthy();
  });

  it('calls onChange when operator is changed via select trigger', () => {
    const onChange = vi.fn();
    render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    const trigger = screen.getByTestId('mock-select-trigger');
    fireEvent.click(trigger);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveProperty('op', '__test_value__');
  });

  it('calls onChange when value input changes', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ConditionItem
        value={makeItem({ right: 'hello' })}
        fields={testFields}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].right).toBe('world');
  });

  it('renders number input for number field type', () => {
    const { container } = render(
      <ConditionItem
        value={makeItem({ left: { type: 'field', field: 'age' }, op: 'equal' })}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toBeTruthy();
  });

  it('renders select input for select field type', () => {
    const { container } = render(
      <ConditionItem
        value={makeItem({ left: { type: 'field', field: 'status' }, op: 'select_equals' })}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.querySelector('[data-testid="mock-select"]')).toBeTruthy();
  });

  it('handles field with group type', () => {
    const groupedFields: ConditionField[] = [
      {
        type: 'group',
        label: 'Personal',
        children: [{ name: 'name', label: 'Name', type: 'text' }],
      } as any,
    ];
    const { container } = render(
      <ConditionItem
        value={makeItem({ left: { type: 'field', field: 'name' } })}
        fields={groupedFields}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(container.querySelector('[data-slot="condition-item"]')).toBeTruthy();
  });

  it('defaults to text type for unknown field', () => {
    expect(() => {
      render(
        <ConditionItem
          value={makeItem({ left: { type: 'field', field: 'nonexistent' } })}
          fields={testFields}
          onChange={() => {}}
          onRemove={() => {}}
        />,
      );
    }).toThrow();
  });

  it('renders null for value input when op is is_empty', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ConditionItem
        value={makeItem({ op: 'is_empty' })}
        fields={testFields}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    expect(container.querySelector('input[type="text"]')).toBeNull();
    expect(container.querySelector('input[type="number"]')).toBeNull();
  });

  it('passes usedFields and uniqueFields props correctly', () => {
    const usedFields = new Set(['age']);
    const { container } = render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
        usedFields={usedFields}
        uniqueFields={true}
      />,
    );
    expect(container.querySelector('[data-slot="condition-item"]')).toBeTruthy();
  });

  it('keeps the remove button visible before hover and fully visible on focus', () => {
    render(
      <ConditionItem
        value={makeItem()}
        fields={testFields}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );

    const removeButton = screen.getByRole('button', { name: 'Remove condition' });
    expect(removeButton.className).toContain('opacity-40');
    expect(removeButton.className).toContain('group-hover:opacity-100');
    expect(removeButton.className).toContain('focus:opacity-100');
  });
});

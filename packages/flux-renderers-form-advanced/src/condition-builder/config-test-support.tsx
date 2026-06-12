import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ConditionGroup } from './condition-group.js';
import type { ConditionBuilderSchema, ConditionField, ConditionGroupValue } from './types.js';

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
  useSortable: ({ id }: any) => ({
    attributes: { 'data-sortable-id': id },
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

vi.mock('@nop-chaos/ui', () => {
  const forwardRef = React.forwardRef;

  function MockCombobox({ children }: any) {
    return <div data-testid="mock-combobox">{children}</div>;
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
  MockSelectValue.displayName = 'SelectValue';

  const MockSelectGroup = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  (MockSelectGroup as any).displayName = 'SelectGroup';

  const MockSelectLabel = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  (MockSelectLabel as any).displayName = 'SelectLabel';

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

  const MockBadge = forwardRef(({ children, ...props }: any, ref: any) => (
    <span ref={ref} {...props}>
      {children}
    </span>
  ));
  (MockBadge as any).displayName = 'Badge';

  const MockSpinner = forwardRef((props: any, ref: any) => <div ref={ref} data-testid="mock-spinner" {...props} />);
  (MockSpinner as any).displayName = 'Spinner';

  return {
    cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
    Combobox: MockCombobox,
    ComboboxInput: MockComboboxInput,
    ComboboxContent: MockComboboxContent,
    ComboboxEmpty: MockComboboxEmpty,
    ComboboxList: MockComboboxList,
    ComboboxItem: MockComboboxItem,
    Select: MockSelect,
    SelectTrigger: MockSelectTrigger,
    SelectContent: MockSelectContent,
    SelectItem: MockSelectItem,
    SelectValue: MockSelectValue,
    SelectGroup: MockSelectGroup,
    SelectLabel: MockSelectLabel,
    Button: MockButton,
    Input: MockInput,
    Badge: MockBadge,
    Spinner: MockSpinner,
  };
});

export const testFields: ConditionField[] = [
  { name: 'name', label: '姓名', type: 'text' },
  { name: 'age', label: '年龄', type: 'number' },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '活跃', value: 'active' },
      { label: '停用', value: 'inactive' },
    ],
  },
  { name: 'vip', label: 'VIP', type: 'boolean' },
  { name: 'score', label: '分数', type: 'number' },
];

export { ConditionGroup };

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

export function makeEmptyGroup(): ConditionGroupValue {
  return { id: 'g1', conjunction: 'and', children: [] };
}

export function renderGroup(
  schema: Partial<ConditionBuilderSchema>,
  value?: ConditionGroupValue,
  onChange?: (v: ConditionGroupValue) => void,
  options?: {
    operatorsOverride?: import('./types.js').ConditionOperatorOverrides;
    disabled?: boolean;
    depth?: number;
  },
): ReturnType<typeof render> {
  const fullSchema: ConditionBuilderSchema = {
    type: 'condition-builder',
    name: 'test',
    ...schema,
  };
  const groupValue = value ?? makeEmptyGroup();
  const handleChange = onChange ?? vi.fn();
  return render(
    <ConditionGroup
      value={groupValue}
      schema={fullSchema}
      fields={(schema.fields as ConditionField[] | undefined) ?? testFields}
      operatorsOverride={options?.operatorsOverride}
      onChange={handleChange}
      disabled={options?.disabled}
      depth={options?.depth ?? 0}
    />,
  );
}

afterEach(cleanup);

import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ConditionGroup } from './ConditionGroup';
import type {
  ConditionBuilderSchema,
  ConditionField,
  ConditionGroupValue,
} from './types';

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

  const MockSelectTrigger = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="select-trigger" {...props}>{children}</div>
  ));
  (MockSelectTrigger as any).displayName = 'SelectTrigger';

  const MockSelectContent = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="select-content" {...props}>{children}</div>
  ));
  (MockSelectContent as any).displayName = 'SelectContent';

  const MockSelectItem = forwardRef(({ children, value, ...props }: any, ref: any) => (
    <div ref={ref} data-testid={`select-item-${value}`} data-value={value} {...props}>{children}</div>
  ));
  (MockSelectItem as any).displayName = 'SelectItem';

  const MockSelectValue = ({ placeholder }: any) => <span>{placeholder}</span>;
  MockSelectValue.displayName = 'SelectValue';

  const MockSelectGroup = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  (MockSelectGroup as any).displayName = 'SelectGroup';

  const MockSelectLabel = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  (MockSelectLabel as any).displayName = 'SelectLabel';

  function MockSelect({ children, value, onValueChange, disabled }: any) {
    return (
      <div data-testid="mock-select" data-value={value} data-disabled={disabled ?? false}>
        <button data-testid="mock-select-trigger" onClick={() => onValueChange?.('__test_value__')}>
          {value || 'select'}
        </button>
        <div data-testid="mock-select-content">{children}</div>
      </div>
    );
  }

  const MockButton = forwardRef(({ children, onClick, disabled, type, ...props }: any, ref: any) => (
    <button ref={ref} onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ));
  (MockButton as any).displayName = 'Button';

  const MockInput = forwardRef(({ onChange, value, ...props }: any, ref: any) => (
    <input ref={ref} value={value ?? ''} onChange={onChange} {...props} />
  ));
  (MockInput as any).displayName = 'Input';

  const MockBadge = forwardRef(({ children, ...props }: any, ref: any) => (
    <span ref={ref} {...props}>{children}</span>
  ));
  (MockBadge as any).displayName = 'Badge';

  return {
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
  };
});

const testFields: ConditionField[] = [
  { name: 'name', label: '姓名', type: 'text' },
  { name: 'age', label: '年龄', type: 'number' },
  { name: 'status', label: '状态', type: 'select', options: [
    { label: '活跃', value: 'active' },
    { label: '停用', value: 'inactive' },
  ]},
  { name: 'vip', label: 'VIP', type: 'boolean' },
  { name: 'score', label: '分数', type: 'number' },
];

function makeEmptyGroup(): ConditionGroupValue {
  return { id: 'g1', conjunction: 'and', children: [] };
}

function renderGroup(
  schema: Partial<ConditionBuilderSchema>,
  value?: ConditionGroupValue,
  onChange?: (v: ConditionGroupValue) => void,
) {
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
      fields={testFields}
      onChange={handleChange}
      depth={0}
    />,
  );
}

afterEach(cleanup);

describe('condition-builder config integration', () => {
  describe('showANDOR', () => {
    it('renders AND/OR toggle buttons when showANDOR is true and builderMode is full', () => {
      renderGroup({ showANDOR: true, builderMode: 'full' });
      expect(screen.queryAllByText('并且').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('或者').length).toBeGreaterThanOrEqual(1);
    });

    it('hides AND/OR toggle when showANDOR is false', () => {
      renderGroup({ showANDOR: false, showNot: false });
      expect(screen.queryAllByText('或者')).toHaveLength(0);
    });

    it('shows static conjunction label when showNot is true but showANDOR is false', () => {
      renderGroup({ showANDOR: false, showNot: true });
      expect(screen.queryAllByText('或者')).toHaveLength(0);
      expect(screen.queryAllByText('并且').length).toBeGreaterThanOrEqual(1);
    });

    it('renders static conjunction label in simple mode even when showANDOR is true', () => {
      renderGroup({ showANDOR: true, builderMode: 'simple' });
      expect(screen.queryAllByText('或者')).toHaveLength(0);
      expect(screen.queryAllByText('并且').length).toBeGreaterThanOrEqual(1);
    });

    it('toggles conjunction on button click', () => {
      const onChange = vi.fn();
      renderGroup({ showANDOR: true, builderMode: 'full' }, makeEmptyGroup(), onChange);
      const orBtns = screen.queryAllByText('或者');
      fireEvent.click(orBtns[0]);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ conjunction: 'or' }),
      );
    });
  });

  describe('showNot', () => {
    it('does not render NOT toggle when showNot is false (default)', () => {
      renderGroup({ showNot: false, showANDOR: true });
      expect(screen.queryAllByText('取反')).toHaveLength(0);
    });

    it('renders NOT toggle when showNot is true', () => {
      renderGroup({ showNot: true, showANDOR: true });
      expect(screen.queryAllByText('取反').length).toBeGreaterThanOrEqual(1);
    });

    it('toggles not on click', () => {
      const onChange = vi.fn();
      renderGroup({ showNot: true, showANDOR: true }, makeEmptyGroup(), onChange);
      const notBtns = screen.queryAllByText('取反');
      fireEvent.click(notBtns[0]);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ not: true }),
      );
    });

    it('shows checkmark when not is already true', () => {
      renderGroup(
        { showNot: true, showANDOR: true },
        { id: 'g1', conjunction: 'and', not: true, children: [] },
      );
      expect(screen.queryAllByText('取反 ✓').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('builderMode', () => {
    it('shows "Add Group" button in full mode', () => {
      renderGroup({ builderMode: 'full' });
      expect(screen.queryAllByText('添加分组').length).toBeGreaterThanOrEqual(1);
    });

    it('hides "Add Group" button in simple mode', () => {
      renderGroup({ builderMode: 'simple' });
      expect(screen.queryAllByText('添加分组')).toHaveLength(0);
    });

    it('shows "Add Condition" button in both modes', () => {
      renderGroup({ builderMode: 'simple' });
      expect(screen.queryAllByText('添加条件').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('maxDepth', () => {
    it('allows nesting when maxDepth is not set', () => {
      renderGroup({ builderMode: 'full' });
      expect(screen.queryAllByText('添加分组').length).toBeGreaterThanOrEqual(1);
    });

    it('prevents nesting at depth 0 when maxDepth is 0', () => {
      renderGroup({ builderMode: 'full', maxDepth: 0 });
      expect(screen.queryAllByText('添加分组')).toHaveLength(0);
    });

    it('allows nesting when depth < maxDepth', () => {
      const fullSchema: ConditionBuilderSchema = {
        type: 'condition-builder',
        name: 'test',
        builderMode: 'full',
        maxDepth: 2,
      };
      render(
        <ConditionGroup
          value={makeEmptyGroup()}
          schema={fullSchema}
          fields={testFields}
          onChange={vi.fn()}
          depth={0}
        />,
      );
      expect(screen.queryAllByText('添加分组').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('maxItemsPerGroup', () => {
    it('shows add button when under limit', () => {
      renderGroup({ maxItemsPerGroup: 2 });
      expect(screen.queryAllByText('添加条件').length).toBeGreaterThanOrEqual(1);
    });

    it('hides add condition button when at limit but keeps add group', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
          { id: 'i2', left: { type: 'field', field: 'age' }, op: 'equal', right: undefined },
        ],
      };
      renderGroup({ maxItemsPerGroup: 2, builderMode: 'full' }, value);
      expect(screen.queryAllByText('添加条件')).toHaveLength(0);
      expect(screen.queryAllByText('添加分组').length).toBeGreaterThanOrEqual(1);
    });

    it('hides all add buttons when at limit and in simple mode', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
          { id: 'i2', left: { type: 'field', field: 'age' }, op: 'equal', right: undefined },
        ],
      };
      renderGroup({ maxItemsPerGroup: 2, builderMode: 'simple' }, value);
      expect(screen.queryAllByText('添加条件')).toHaveLength(0);
      expect(screen.queryAllByText('添加分组')).toHaveLength(0);
    });

    it('still allows adding when under limit', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      renderGroup({ maxItemsPerGroup: 2 }, value);
      expect(screen.queryAllByText('添加条件').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('custom button labels', () => {
    it('uses custom addConditionLabel', () => {
      renderGroup({ addConditionLabel: '加条件' });
      expect(screen.queryAllByText('加条件').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('添加条件')).toHaveLength(0);
    });

    it('uses custom addGroupLabel', () => {
      renderGroup({ addGroupLabel: '加分组' });
      expect(screen.queryAllByText('加分组').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('添加分组')).toHaveLength(0);
    });
  });

  describe('draggable', () => {
    it('does not render grip icon when draggable is false', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      const { container } = renderGroup({ draggable: false }, value);
      expect(container.querySelector('.cursor-grab')).toBeNull();
    });

    it('renders grip icon when draggable is true', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      const { container } = renderGroup({ draggable: true }, value);
      expect(container.querySelector('.cursor-grab')).not.toBeNull();
    });
  });

  describe('placeholder', () => {
    it('renders default empty text when no conditions', () => {
      renderGroup({});
      expect(screen.queryAllByText('暂无条件，请点击下方按钮添加').length).toBeGreaterThanOrEqual(1);
    });

    it('renders custom placeholder when set', () => {
      renderGroup({ placeholder: '没有条件' });
      expect(screen.queryAllByText('没有条件').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('addCondition / addGroup actions', () => {
    it('adds a condition item on click', () => {
      const onChange = vi.fn();
      renderGroup({}, makeEmptyGroup(), onChange);
      const addBtns = screen.queryAllByText('添加条件');
      fireEvent.click(addBtns[0]);
      expect(onChange).toHaveBeenCalledTimes(1);
      const newGroup = onChange.mock.calls[0][0] as ConditionGroupValue;
      expect(newGroup.children).toHaveLength(1);
      expect(newGroup.children[0]).toHaveProperty('left');
      expect(newGroup.children[0]).toHaveProperty('op');
    });

    it('adds a nested group on click', () => {
      const onChange = vi.fn();
      renderGroup({ builderMode: 'full' }, makeEmptyGroup(), onChange);
      const addGroupBtns = screen.queryAllByText('添加分组');
      fireEvent.click(addGroupBtns[0]);
      expect(onChange).toHaveBeenCalledTimes(1);
      const newGroup = onChange.mock.calls[0][0] as ConditionGroupValue;
      expect(newGroup.children).toHaveLength(1);
      expect(newGroup.children[0]).toHaveProperty('children');
    });
  });

  describe('remove actions', () => {
    it('removes a condition item', () => {
      const onChange = vi.fn();
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      const { container } = renderGroup({}, value, onChange);
      const deleteBtn = container.querySelector('.hover\\:text-destructive');
      expect(deleteBtn).not.toBeNull();
      fireEvent.click(deleteBtn!);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ children: [] }),
      );
    });

    it('removes a nested group at depth > 0', () => {
      const onChange = vi.fn();
      const innerGroup: ConditionGroupValue = {
        id: 'inner',
        conjunction: 'or',
        children: [],
      };
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [innerGroup],
      };
      render(
        <ConditionGroup
          value={value}
          schema={{ type: 'condition-builder', name: 'test', builderMode: 'full' }}
          fields={testFields}
          onChange={onChange}
          depth={0}
        />,
      );
      const removeBtns = screen.queryAllByTitle('删除分组');
      expect(removeBtns.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(removeBtns[0]);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ children: [] }),
      );
    });
  });

  describe('operatorsOverride - custom labels', () => {
    it('renders custom operator label via operatorsOverride', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      const operatorsOverride = {
        labels: { equal: '等于(自定义)' },
      };
      render(
        <ConditionGroup
          value={value}
          schema={{ type: 'condition-builder', name: 'test' }}
          fields={testFields}
          operatorsOverride={operatorsOverride}
          onChange={vi.fn()}
          depth={0}
        />,
      );
      expect(screen.queryAllByText('等于(自定义)').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('initial data rendering', () => {
    it('renders items with correct initial data', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'or',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: 'test' },
          { id: 'i2', left: { type: 'field', field: 'age' }, op: 'greater', right: 18 },
        ],
      };
      renderGroup({ showANDOR: true, builderMode: 'full' }, value);
      expect(screen.queryAllByText('或者').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByTestId('mock-select').length).toBeGreaterThanOrEqual(2);
    });

    it('renders nested groups from initial data', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          {
            id: 'g2',
            conjunction: 'or' as const,
            children: [
              { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: 'test' },
            ],
          },
        ],
      };
      renderGroup({ showANDOR: true, builderMode: 'full' }, value);
      expect(screen.queryAllByText('或者').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('uniqueFields', () => {
    it('passes usedFields to ConditionItem when uniqueFields is true', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
          { id: 'i2', left: { type: 'field', field: 'age' }, op: 'equal', right: undefined },
        ],
      };
      renderGroup({ uniqueFields: true }, value);
      expect(screen.queryAllByTestId('mock-select').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('disabled state', () => {
    it('disables add buttons when disabled is true', () => {
      render(
        <ConditionGroup
          value={makeEmptyGroup()}
          schema={{ type: 'condition-builder', name: 'test' }}
          fields={testFields}
          onChange={vi.fn()}
          disabled={true}
          depth={0}
        />,
      );
      const addBtns = screen.queryAllByText('添加条件');
      const button = addBtns[0].closest('button');
      expect(button).toBeTruthy();
      expect((button as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('drag handle', () => {
    it('renders grip icon with drag listeners when draggable is true', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      const { container } = renderGroup({ draggable: true }, value);
      const handle = container.querySelector('[data-dnd-listeners="true"]');
      expect(handle).not.toBeNull();
    });

    it('does not render drag listeners when draggable is false', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      const { container } = renderGroup({ draggable: false }, value);
      const handle = container.querySelector('[data-dnd-listeners="true"]');
      expect(handle).toBeNull();
    });

    it('does not render drag handle when disabled', () => {
      const value: ConditionGroupValue = {
        id: 'g1',
        conjunction: 'and',
        children: [
          { id: 'i1', left: { type: 'field', field: 'name' }, op: 'equal', right: undefined },
        ],
      };
      const { container } = render(
        <ConditionGroup
          value={value}
          schema={{ type: 'condition-builder', name: 'test', draggable: true }}
          fields={testFields}
          onChange={vi.fn()}
          disabled={true}
          depth={0}
        />,
      );
      expect(container.querySelector('[data-dnd-listeners="true"]')).toBeNull();
    });
  });
});

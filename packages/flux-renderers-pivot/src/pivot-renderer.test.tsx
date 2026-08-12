import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { PivotTableRenderer } from './pivot-renderer.js';
import type { PivotTableSchema } from './schemas.js';

let mockThrowOnConstruct = false;

interface MockPivotTableInstance {
  container: HTMLElement;
  option: unknown;
  theme: unknown;
  listeners: Record<string, Array<(args: unknown) => void>>;
  setRecords: ReturnType<typeof vi.fn>;
  updateOption: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  emit: (event: string, args: unknown) => void;
}

const pivotMockInstances: MockPivotTableInstance[] = [];

// 函数声明（非 class）保证 vi.mock factory 可引用（ESM hoisting 语义）
function MockPivotTable(this: MockPivotTableInstance, container: HTMLElement, option: unknown) {
  if (mockThrowOnConstruct) {
    throw new Error('canvas unavailable');
  }
  this.container = container;
  this.option = option;
  this.theme = undefined;
  this.listeners = {};
  this.setRecords = vi.fn();
  this.updateOption = vi.fn();
  this.release = vi.fn();
  this.off = vi.fn();
  this.on = vi.fn((event: string, callback: (args: unknown) => void) => {
    (this.listeners[event] ??= []).push(callback);
  });
  pivotMockInstances.push(this);
}
MockPivotTable.prototype.emit = function emit(this: MockPivotTableInstance, event: string, args: unknown) {
  for (const callback of this.listeners[event] ?? []) {
    callback(args);
  }
};

vi.mock('@visactor/vtable', () => ({
  PivotTable: MockPivotTable,
}));

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
  Spinner: (props: Record<string, unknown>) => React.createElement('span', { 'data-testid': 'spinner', ...props }),
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => `t:${key}`,
}));

const SALES_RECORDS = [
  { region: 'North', category: 'A', sales: 10 },
  { region: 'North', category: 'B', sales: 20 },
  { region: 'South', category: 'A', sales: 30 },
];

function makeProps(overrides: Record<string, unknown> = {}): RendererComponentProps<PivotTableSchema> {
  const baseProps = {
    type: 'pivot-table',
    records: SALES_RECORDS,
    rowDimensions: ['region'],
    columnDimensions: ['category'],
    indicators: [{ field: 'sales' }],
  };
  const base: Record<string, unknown> = {
    id: 'pivot-node',
    path: 'pivot[0]',
    schema: { type: 'pivot-table' } as PivotTableSchema,
    templateNode: {} as never,
    node: { scope: { id: 'scope-1' } } as never,
    props: baseProps,
    meta: { cid: 7, className: 'custom-pivot', testid: 'pivot-root' },
    events: {},
    reactions: {},
    regions: {},
    helpers: {} as never,
  };
  return {
    ...base,
    ...overrides,
    props: {
      ...baseProps,
      ...((overrides.props as Record<string, unknown> | undefined) ?? {}),
    },
  } as unknown as RendererComponentProps<PivotTableSchema>;
}

function exposedInstance(key = 'pivot-node'): MockPivotTableInstance | undefined {
  return (window as unknown as Record<string, { instance: MockPivotTableInstance } | undefined>)[
    `__flux_pivot_${key}`
  ]?.instance;
}

beforeEach(() => {
  pivotMockInstances.length = 0;
});

afterEach(() => {
  cleanup();
  delete (window as unknown as Record<string, unknown>)['__flux_pivot_pivot-node'];
});

describe('PivotTableRenderer - 挂载', () => {
  it('new PivotTable(container, option) 以正确 option 调用，实例经 __flux_pivot_<id> 锚点暴露', () => {
    render(<PivotTableRenderer {...makeProps()} />);
    expect(pivotMockInstances).toHaveLength(1);
    const instance = pivotMockInstances[0];
    expect(instance.option).toMatchObject({
      records: SALES_RECORDS,
      rows: [{ dimensionKey: 'region', title: 'region', headerType: 'text' }],
      columns: [{ dimensionKey: 'category', title: 'category', headerType: 'text' }],
      indicators: [{ indicatorKey: 'sales', title: 'sales', headerType: 'text', cellType: 'text' }],
      dataConfig: {
        aggregationRules: [{ indicatorKey: 'sales', field: 'sales', aggregationType: 'SUM' }],
      },
    });
    expect(exposedInstance()).toBe(instance);
    expect(instance.container).toBeTruthy();
  });

  it('schema theme 覆盖映射后 option.theme 存在', () => {
    render(<PivotTableRenderer {...makeProps({ props: { theme: {} } })} />);
    const option = pivotMockInstances[0].option as { theme?: unknown };
    expect(option.theme).toBeDefined();
  });

  it('schema theme 按 key 覆盖映射结果（schema 键优先）', () => {
    render(
      <PivotTableRenderer
        {...makeProps({
          props: { theme: { underlayBackgroundColor: 'red', defaultStyle: { color: 'green' } } },
        })}
      />,
    );
    const option = pivotMockInstances[0].option as {
      theme: {
        underlayBackgroundColor?: string;
        defaultStyle?: { color?: string; bgColor?: string };
      };
    };
    expect(option.theme.underlayBackgroundColor).toBe('red');
    expect(option.theme.defaultStyle?.color).toBe('green');
    // 未被覆盖的映射键仍来自 design token 映射（fallback 默认色）
    expect(option.theme.defaultStyle?.bgColor).toBe('#ffffff');
  });
});

describe('PivotTableRenderer - 数据更新', () => {
  it('仅 records 变化 → setRecords 被调用且实例 identity 稳定（无 remount）', () => {
    const { rerender } = render(<PivotTableRenderer {...makeProps()} />);
    const first = pivotMockInstances[0];
    const nextRecords = [...SALES_RECORDS, { region: 'West', category: 'B', sales: 40 }];
    rerender(<PivotTableRenderer {...makeProps({ props: { records: nextRecords } })} />);
    expect(pivotMockInstances).toHaveLength(1);
    expect(exposedInstance()).toBe(first);
    expect(first.setRecords).toHaveBeenCalledWith(nextRecords);
    expect(first.updateOption).not.toHaveBeenCalled();
  });

  it('records 引用不变但内容相同 → 不触发任何实例更新', () => {
    const { rerender } = render(<PivotTableRenderer {...makeProps()} />);
    const first = pivotMockInstances[0];
    rerender(<PivotTableRenderer {...makeProps()} />);
    expect(first.setRecords).not.toHaveBeenCalled();
    expect(first.updateOption).not.toHaveBeenCalled();
  });
});

describe('PivotTableRenderer - 配置更新', () => {
  it('维度/指标变化 → updateOption 全量（含新 records）', () => {
    const { rerender } = render(<PivotTableRenderer {...makeProps()} />);
    const first = pivotMockInstances[0];
    const nextRecords = [...SALES_RECORDS, { region: 'West', category: 'B', sales: 40 }];
    rerender(
      <PivotTableRenderer
        {...makeProps({
          props: {
            records: nextRecords,
            rowDimensions: ['region', 'quarter'],
            indicators: [{ field: 'sales' }, { field: 'profit' }],
          },
        })}
      />,
    );
    expect(pivotMockInstances).toHaveLength(1);
    const option = first.updateOption.mock.calls[0][0] as {
      rows: unknown[];
      records: unknown[];
      indicators: unknown[];
    };
    expect(option.rows).toHaveLength(2);
    expect(option.indicators).toHaveLength(2);
    expect(option.records).toBe(nextRecords);
    expect(first.setRecords).not.toHaveBeenCalled();
  });
});

describe('PivotTableRenderer - 卸载', () => {
  it('unmount → release() 被调用，暴露句柄清除', () => {
    const { unmount } = render(<PivotTableRenderer {...makeProps()} />);
    const first = pivotMockInstances[0];
    unmount();
    expect(first.release).toHaveBeenCalledTimes(1);
    expect(exposedInstance()).toBeUndefined();
  });
});

describe('PivotTableRenderer - 空态与降级', () => {
  it('空数组 → 不创建实例，渲染 empty slot（缺省 noData）', () => {
    render(<PivotTableRenderer {...makeProps({ props: { records: [] } })} />);
    expect(pivotMockInstances).toHaveLength(0);
    expect(document.querySelector('[data-slot="pivot-empty"]')).toBeTruthy();
    expect(screen.getByText('t:flux.common.noData')).toBeTruthy();
  });

  it('无合法 indicators → 不创建实例，渲染 empty slot', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<PivotTableRenderer {...makeProps({ props: { indicators: [] } })} />);
    expect(warn).toHaveBeenCalled();
    expect(pivotMockInstances).toHaveLength(0);
    expect(document.querySelector('[data-slot="pivot-empty"]')).toBeTruthy();
    warn.mockRestore();
  });

  it('数据由空变为非空 → 创建实例；非空变空 → release 并回到 empty slot', () => {
    const { rerender } = render(<PivotTableRenderer {...makeProps({ props: { records: [] } })} />);
    expect(pivotMockInstances).toHaveLength(0);
    rerender(<PivotTableRenderer {...makeProps()} />);
    expect(pivotMockInstances).toHaveLength(1);
    const first = pivotMockInstances[0];
    rerender(<PivotTableRenderer {...makeProps({ props: { records: [] } })} />);
    expect(first.release).toHaveBeenCalled();
    expect(pivotMockInstances).toHaveLength(1);
    expect(document.querySelector('[data-slot="pivot-empty"]')).toBeTruthy();
  });

  it('实例构造抛错 → 渲染错误占位而非崩溃', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockThrowOnConstruct = true;
    try {
      await act(async () => {
        render(<PivotTableRenderer {...makeProps()} />);
      });
      expect(document.querySelector('[data-slot="pivot-error"]')).toBeTruthy();
    } finally {
      mockThrowOnConstruct = false;
      errorSpy.mockRestore();
    }
  });
});

describe('PivotTableRenderer - loading 态', () => {
  it('loading=true → 渲染 loading 占位，不创建实例', () => {
    render(<PivotTableRenderer {...makeProps({ props: { loading: true } })} />);
    expect(pivotMockInstances).toHaveLength(0);
    expect(document.querySelector('[data-slot="pivot-loading"]')).toBeTruthy();
  });

  it('loading=true → false 往返：旧实例释放、新 canvas div 绑定新实例（P1-02）', () => {
    const { rerender } = render(<PivotTableRenderer {...makeProps()} />);
    expect(pivotMockInstances).toHaveLength(1);
    const first = pivotMockInstances[0];

    // loading=true：canvas div 被 loading 占位替换；悬挂在已卸载节点上的旧实例必须被释放
    rerender(<PivotTableRenderer {...makeProps({ props: { loading: true } })} />);
    expect(document.querySelector('[data-slot="pivot-loading"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="pivot-canvas"]')).toBeNull();
    expect(first.release).toHaveBeenCalled();
    expect(exposedInstance()).toBeUndefined();

    // loading 翻回 false（同 data）：新 canvas div 挂载，实例 effect 重跑 → 新实例绑定新节点
    rerender(<PivotTableRenderer {...makeProps()} />);
    expect(pivotMockInstances).toHaveLength(2);
    const second = pivotMockInstances[1];
    expect(exposedInstance()).toBe(second);
    expect(document.querySelector('[data-slot="pivot-canvas"]')).toBeTruthy();
    expect(second.container).toBe(document.querySelector('[data-slot="pivot-canvas"]'));
    expect(first.release).toHaveBeenCalledTimes(1);
  });
});

describe('PivotTableRenderer - 事件桥接', () => {
  it.each([
    ['click_cell', 'onCellClick', 'pivot:cell-click'],
    ['selected_cell', 'onSelectionChange', 'pivot:selection-change'],
    ['sort_click', 'onSort', 'pivot:sort-click'],
    ['drillmenu_click', 'onDrill', 'pivot:drill-click'],
    ['change_cell_value', 'onCellEdit', 'pivot:cell-edit'],
  ] as const)('VTable %s → props.events.%s（payload type=%s）', (vtableEvent, handlerKey, payloadType) => {
    const handler = vi.fn();
    render(<PivotTableRenderer {...makeProps({ events: { [handlerKey]: handler } })} />);
    const instance = pivotMockInstances[0];
    instance.emit(vtableEvent, { col: 1, row: 2, value: 'x' });
    expect(handler).toHaveBeenCalledTimes(1);
    const [payload, ctx] = handler.mock.calls[0] as [Record<string, unknown>, { event: Record<string, unknown>; evaluationBindings: Record<string, unknown> }];
    expect(payload.type).toBe(payloadType);
    expect(payload.col).toBe(1);
    expect(payload.row).toBe(2);
    expect(ctx.event).toBe(payload);
    expect(ctx.evaluationBindings).toBe(payload);
  });

  it('回调抛错不中断后续事件（Failure Path pivot-event-bridge）', () => {
    const handler = vi.fn().mockImplementation(() => {
      throw new Error('handler boom');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<PivotTableRenderer {...makeProps({ events: { onCellClick: handler } })} />);
    const instance = pivotMockInstances[0];
    expect(() => instance.emit('click_cell', { col: 0, row: 0 })).not.toThrow();
    expect(() => instance.emit('click_cell', { col: 0, row: 0 })).not.toThrow();
    expect(handler).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('未绑定 handler 的事件触发是 no-op', () => {
    render(<PivotTableRenderer {...makeProps()} />);
    const instance = pivotMockInstances[0];
    expect(() => instance.emit('click_cell', { col: 0, row: 0 })).not.toThrow();
    expect(() => instance.emit('drillmenu_click', {})).not.toThrow();
  });
});

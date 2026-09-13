import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { EChartsSchema } from '../echarts-schemas.js';

const mockChart = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};
const mockInit = vi.fn((..._args: unknown[]) => mockChart);

vi.mock('../echarts-setup.js', () => ({
  getECharts: () => ({ init: mockInit, dispose: vi.fn() }),
}));

const fakeScope = { id: 'scope-1', path: '$' };

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => undefined,
    useRenderScope: () => fakeScope,
    hasRendererSlotContent: (content: unknown) =>
      content !== null && content !== undefined && content !== false,
    resolveRendererSlotContent: (props: any, key: string, options: { fallback: string }) =>
      props.regions?.[key]?.render?.() ?? props.props[key] ?? options?.fallback,
  };
});

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

import { EChartsRenderer } from '../echarts-renderer.js';

function createProps(overrides: Record<string, unknown>): RendererComponentProps<EChartsSchema> {
  const { dispatch, ...rest } = overrides as { dispatch?: unknown } & Record<string, unknown>;
  return {
    id: 'echarts-events',
    path: '$',
    schema: { type: 'echarts', ...rest } as unknown as EChartsSchema,
    templateNode: {},
    node: {},
    props: { ...rest },
    meta: { cid: 11 },
    regions: {},
    events: {},
    reactions: {},
    helpers: {
      dispatch: (dispatch as unknown as RendererComponentProps<EChartsSchema>['helpers']['dispatch']) ?? vi.fn(() => Promise.resolve({ ok: true })),
    },
  } as unknown as RendererComponentProps<EChartsSchema>;
}

const clickAction = { action: 'showToast', args: { message: 'clicked' } };

beforeEach(() => {
  mockInit.mockClear();
  mockChart.setOption.mockClear();
  mockChart.on.mockClear();
  mockChart.off.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('echarts events bridge (A3)', () => {
  it('binds onClick to the native click event and dispatches the declared action with a normalized event', async () => {
    const props = createProps({
      option: { series: [] },
      events: { onClick: clickAction },
    });
    render(<EChartsRenderer {...props} />);
    await vi.waitFor(() => expect(mockChart.on).toHaveBeenCalled());

    expect(mockChart.on).toHaveBeenCalledTimes(1);
    const [nativeEvent, handler] = mockChart.on.mock.calls[0];
    expect(nativeEvent).toBe('click');
    expect(typeof handler).toBe('function');

    handler({
      componentType: 'series',
      seriesType: 'bar',
      name: 'Jan',
      value: 42,
    });
    await vi.waitFor(() => {
      expect(props.helpers.dispatch).toHaveBeenCalledWith(clickAction, {
        event: expect.objectContaining({
          type: 'click',
          componentType: 'series',
          seriesType: 'bar',
          name: 'Jan',
          value: 42,
        }),
        scope: fakeScope,
      });
    });
  });

  it('maps every NATIVE_EVENT_MAP key to its echarts native event name', async () => {
    const events = {
      onClick: clickAction,
      onDblClick: clickAction,
      onMouseOver: clickAction,
      onMouseOut: clickAction,
      onMouseDown: clickAction,
      onMouseUp: clickAction,
      onContextMenu: clickAction,
      onDataZoom: clickAction,
      onLegendSelectChanged: clickAction,
    };
    render(<EChartsRenderer {...createProps({ option: { series: [] }, events })} />);
    await vi.waitFor(() => expect(mockChart.on).toHaveBeenCalledTimes(9));

    const natives = mockChart.on.mock.calls.map((call) => call[0]).sort();
    expect(natives).toEqual(
      [
        'click',
        'dblclick',
        'mouseover',
        'mouseout',
        'mousedown',
        'mouseup',
        'contextmenu',
        'dataZoom',
        'legendselectchanged',
      ].sort(),
    );
  });

  it('ignores unknown on* keys with a warning and keeps the known ones', async () => {
    render(
      <EChartsRenderer
        {...createProps({
          option: { series: [] },
          events: { onClick: clickAction, onFoo: clickAction },
        })}
      />,
    );
    await vi.waitFor(() => expect(mockChart.on).toHaveBeenCalledTimes(1));
    expect(mockChart.on.mock.calls[0][0]).toBe('click');
    expect(console.warn).toHaveBeenCalled();
  });

  it('unbinds native handlers on unmount', async () => {
    const { unmount } = render(
      <EChartsRenderer {...createProps({ option: { series: [] }, events: { onClick: clickAction } })} />,
    );
    await vi.waitFor(() => expect(mockChart.on).toHaveBeenCalled());
    unmount();
    expect(mockChart.off).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('does not let a rejected dispatch escape as an unhandled rejection', async () => {
    const proc = (globalThis as { process?: { on?: (event: string, cb: () => void) => void } })
      .process;
    let unhandledCount = 0;
    proc?.on?.('unhandledRejection', () => {
      unhandledCount += 1;
    });

    const failingDispatch = vi.fn(() => Promise.reject(new Error('dispatch boom')));
    render(
      <EChartsRenderer
        {...createProps({
          option: { series: [] },
          events: { onClick: clickAction },
          dispatch: failingDispatch,
        })}
      />,
    );
    await vi.waitFor(() => expect(mockChart.on).toHaveBeenCalled());
    const [, handler] = mockChart.on.mock.calls[0];
    handler({ name: 'Jan' });
    await vi.waitFor(() => expect(failingDispatch).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(unhandledCount).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it('reads events from the raw schema so arg templates survive to dispatch (no render-time evaluation)', async () => {
    const templatedAction = {
      action: 'showToast',
      args: { message: 'clicked: ${event.name}' },
    };
    const props = createProps({ option: { series: [] } });
    // 模拟 definition 的 ignored 字段：events 只在 raw schema 上，编译器不深求值
    (props.schema as EChartsSchema).events = { onClick: templatedAction };
    delete (props.props as Record<string, unknown>).events;

    render(<EChartsRenderer {...props} />);
    await vi.waitFor(() => expect(mockChart.on).toHaveBeenCalledTimes(1));
    const [, handler] = mockChart.on.mock.calls[0];
    handler({ name: 'Jan' });
    await vi.waitFor(() => {
      expect(props.helpers.dispatch).toHaveBeenCalledWith(templatedAction, {
        event: expect.objectContaining({ type: 'click', name: 'Jan' }),
        scope: fakeScope,
      });
    });
  });

  it('dispatches dataZoom events with their params payload', async () => {
    const props = createProps({
      option: { series: [] },
      events: { onDataZoom: clickAction },
    });
    render(<EChartsRenderer {...props} />);
    await vi.waitFor(() => expect(mockChart.on).toHaveBeenCalled());
    const [nativeEvent, handler] = mockChart.on.mock.calls.find(
      (call) => call[0] === 'dataZoom',
    )!;
    expect(nativeEvent).toBe('dataZoom');
    handler({ start: 10, end: 90 });
    await vi.waitFor(() => {
      expect(props.helpers.dispatch).toHaveBeenCalledWith(
        clickAction,
        expect.objectContaining({ event: expect.objectContaining({ type: 'dataZoom', start: 10, end: 90 }) }),
      );
    });
  });
});

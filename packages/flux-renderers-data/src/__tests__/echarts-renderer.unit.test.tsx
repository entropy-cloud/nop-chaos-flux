import React from 'react';
import { cleanup, render, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ComponentCapabilityActionContext,
  ComponentHandle,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import type { EChartsSchema } from '../echarts-schemas.js';

const mockChart = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

const mockInit = vi.fn((..._args: unknown[]) => mockChart);
const mockRegisterMap = vi.fn();

vi.mock('../echarts-setup.js', () => ({
  getECharts: () => ({ init: mockInit, dispose: vi.fn(), registerMap: mockRegisterMap }),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => mockState.currentRegistry,
  useRenderScope: () => undefined,
  createNormalizedActionEvent: (event: unknown) => event,
  hasRendererSlotContent: (content: unknown) =>
    content !== null && content !== undefined && content !== false,
  resolveRendererSlotContent: (props: any, key: string, options: { fallback: string }) =>
    props.regions?.[key]?.render?.() ?? props.props[key] ?? options?.fallback,
}));

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

import { EChartsRenderer } from '../echarts-renderer.js';

type RegistryState = { currentRegistry: { register: ReturnType<typeof vi.fn> } | undefined };
const mockState: RegistryState = { currentRegistry: undefined };

class MockResizeObserver {
  static last: MockResizeObserver | null = null;
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.last = this;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

function createProps(overrides: Record<string, unknown>): RendererComponentProps<EChartsSchema> {
  const { helpers, ...rest } = overrides as { helpers?: unknown } & Record<string, unknown>;
  return {
    id: 'echarts-1',
    path: '$',
    schema: { type: 'echarts', ...rest } as unknown as EChartsSchema,
    templateNode: {} as RendererComponentProps<EChartsSchema>['templateNode'],
    node: {} as RendererComponentProps<EChartsSchema>['node'],
    props: { ...rest } as RendererComponentProps<EChartsSchema>['props'],
    meta: { cid: 7 } as RendererComponentProps<EChartsSchema>['meta'],
    regions: {},
    events: {},
    reactions: {},
    helpers: (helpers as RendererComponentProps<EChartsSchema>['helpers']) ??
      ({ evaluate: (value: unknown) => value } as RendererComponentProps<EChartsSchema>['helpers']),
  } as unknown as RendererComponentProps<EChartsSchema>;
}

const barOption = { xAxis: { type: 'category' }, series: [{ type: 'bar', data: [1, 2, 3] }] };

beforeEach(() => {
  mockInit.mockClear();
  mockRegisterMap.mockClear();
  mockChart.setOption.mockClear();
  mockChart.resize.mockClear();
  mockChart.dispose.mockClear();
  mockState.currentRegistry = undefined;
  MockResizeObserver.last = null;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('EChartsRenderer lifecycle', () => {
  it('inits echarts on the container node with canvas renderer by default', async () => {
    const { container } = render(<EChartsRenderer {...createProps({ option: barOption })} />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    const initDom = mockInit.mock.calls[0][0] as HTMLElement;
    expect(container.contains(initDom)).toBe(true);
    const initTheme = mockInit.mock.calls[0][1];
    const initOpts = mockInit.mock.calls[0][2] as Record<string, unknown>;
    expect(initTheme).toBe('flux');
    expect(initOpts.renderer).toBe('canvas');
  });

  it('passes svg renderer and theme through to init', async () => {
    render(
      <EChartsRenderer
        {...createProps({ option: barOption, renderer: 'svg', theme: 'dark' })}
      />,
    );
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    expect(mockInit.mock.calls[0][1]).toBe('dark');
    expect((mockInit.mock.calls[0][2] as Record<string, unknown>).renderer).toBe('svg');
  });

  it('sets the schema option with notMerge and lazyUpdate flags', async () => {
    render(
      <EChartsRenderer
        {...createProps({ option: barOption, notMerge: true, lazyUpdate: true })}
      />,
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalledTimes(1));
    expect(mockChart.setOption.mock.calls[0][0]).toBe(barOption);
    expect(mockChart.setOption.mock.calls[0][1]).toEqual({ notMerge: true, lazyUpdate: true });
  });

  it('resizes the chart when the container is observed as resized', async () => {
    render(<EChartsRenderer {...createProps({ option: barOption })} />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    const observer = MockResizeObserver.last;
    expect(observer).not.toBeNull();
    act(() => {
      observer!.callback([], {} as ResizeObserver);
    });
    expect(mockChart.resize).toHaveBeenCalledTimes(1);
  });

  it('disposes the chart on unmount', async () => {
    const { unmount } = render(<EChartsRenderer {...createProps({ option: barOption })} />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    unmount();
    expect(mockChart.dispose).toHaveBeenCalledTimes(1);
  });

  it('skips init when unmounted before the echarts chunk resolves (idempotent cleanup)', async () => {
    const { unmount } = render(<EChartsRenderer {...createProps({ option: barOption })} />);
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockChart.dispose).not.toHaveBeenCalled();
    expect(mockChart.setOption).not.toHaveBeenCalled();
  });

  it('renders the explicit empty state without setOption when option is not an object', async () => {
    const { container } = render(<EChartsRenderer {...createProps({ option: 42 })} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('[data-slot="echarts-empty"]')).not.toBeNull();
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockChart.setOption).not.toHaveBeenCalled();
  });

  it('marks data-empty when the option carries no series but still renders the canvas', async () => {
    const { container } = render(
      <EChartsRenderer {...createProps({ option: { title: { text: 'empty' } } })} />,
    );
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalledTimes(1));
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-empty')).toBe('true');
    expect(container.querySelector('[data-slot="echarts-empty"]')).toBeNull();
  });

  it('calls setOption again when the option reference changes', async () => {
    const { rerender } = render(<EChartsRenderer {...createProps({ option: barOption })} />);
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalledTimes(1));
    const nextOption = { ...barOption, series: [{ type: 'line', data: [4, 5] }] };
    rerender(<EChartsRenderer {...createProps({ option: nextOption })} />);
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalledTimes(2));
    expect(mockChart.setOption.mock.calls[1][0]).toBe(nextOption);
    expect(mockChart.dispose).not.toHaveBeenCalled();
  });

  it('does not re-call setOption when rerendered with the identical option reference', async () => {
    const props = createProps({ option: barOption });
    const { rerender } = render(<EChartsRenderer {...props} />);
    await waitFor(() => expect(mockChart.setOption).toHaveBeenCalledTimes(1));
    rerender(<EChartsRenderer {...props} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockChart.setOption).toHaveBeenCalledTimes(1);
  });

  it('applies the height prop to the container style (number and string)', async () => {
    const first = render(<EChartsRenderer {...createProps({ option: barOption, height: 320 })} />);
    expect((first.container.firstElementChild as HTMLElement).style.height).toBe('320px');
    first.unmount();

    const { container } = render(
      <EChartsRenderer {...createProps({ option: barOption, height: '50vh' })} />,
    );
    expect((container.firstElementChild as HTMLElement).style.height).toBe('50vh');
    await waitFor(() => expect(mockInit).toHaveBeenCalled());
  });
});

describe('EChartsRenderer map binding (A2 exception: registerMap bridge)', () => {
  const mapSeriesOption = { series: [{ type: 'map', map: 'world' }] };

  it('resolves the geoJson expression and registers the map before init', async () => {
    const geoJson = { type: 'FeatureCollection', features: [] };
    render(
      <EChartsRenderer
        {...createProps({
          option: mapSeriesOption,
          map: { name: 'world', geoJson: '${worldGeo}' },
          helpers: { evaluate: (expr: string) => (expr === '${worldGeo}' ? geoJson : undefined) },
        })}
      />,
    );
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    expect(mockRegisterMap).toHaveBeenCalledWith('world', geoJson);
    expect(mockRegisterMap.mock.invocationCallOrder[0]).toBeLessThan(
      mockInit.mock.invocationCallOrder[0],
    );
  });

  it('renders the explicit empty state and skips init when the geoJson is unavailable', async () => {
    const { container } = render(
      <EChartsRenderer
        {...createProps({
          option: mapSeriesOption,
          map: { name: 'world', geoJson: '${missingGeo}' },
          helpers: { evaluate: () => undefined },
        })}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('[data-slot="echarts-empty"]')).not.toBeNull();
    expect(mockRegisterMap).not.toHaveBeenCalled();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('re-runs init when a late-arriving geoJson resolves (init gating includes map info)', async () => {
    const geoJson = { type: 'FeatureCollection', features: [] };
    const evaluate = vi.fn((): unknown => undefined);
    const props = createProps({
      option: mapSeriesOption,
      map: { name: 'world', geoJson: '${worldGeo}' },
      helpers: { evaluate },
    });
    const { rerender } = render(<EChartsRenderer {...props} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockInit).not.toHaveBeenCalled();

    evaluate.mockReturnValue(geoJson);
    rerender(<EChartsRenderer {...createProps({
      option: mapSeriesOption,
      map: { name: 'world', geoJson: '${worldGeo}' },
      helpers: { evaluate },
    })} />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    expect(mockRegisterMap).toHaveBeenCalledWith('world', geoJson);
  });
});

describe('EChartsRenderer component handle', () => {
  it('registers a resize capability that resizes the live chart instance', async () => {
    const registered: Array<[ComponentHandle, { cid?: number }]> = [];
    mockState.currentRegistry = {
      register: vi.fn((handle: ComponentHandle, opts: { cid?: number }) => {
        registered.push([handle, opts]);
        return () => {};
      }),
    };

    render(<EChartsRenderer {...createProps({ option: barOption })} />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(registered.length).toBe(1));

    const [handle, opts] = registered[0];
    expect(opts.cid).toBe(7);
    const capabilityContext = {} as ComponentCapabilityActionContext;
    expect(handle.capabilities.invoke('resize', undefined, capabilityContext)).toEqual({
      ok: true,
    });
    expect(mockChart.resize).toHaveBeenCalled();
    const bogusResult = handle.capabilities.invoke('bogus', undefined, capabilityContext);
    expect(!(bogusResult instanceof Promise) && bogusResult.ok).toBe(false);
    expect(handle.capabilities.hasMethod?.('resize')).toBe(true);
    expect(handle.capabilities.listMethods?.()).toEqual(['resize']);
  });
});

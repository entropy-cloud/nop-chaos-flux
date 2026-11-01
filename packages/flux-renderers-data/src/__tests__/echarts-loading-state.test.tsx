import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { EChartsSchema } from '../echarts-schemas.js';

// plan 2026-09-28-5 Phase 2: loading must outrank the empty state (same
// priority contract as chart-renderer) so first async loads show a spinner
// instead of a "no data" flash.
const { initMock, registerMapMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  registerMapMock: vi.fn(),
}));

function makeFakeChart() {
  return {
    setOption: vi.fn(),
    resize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
  };
}

vi.mock('../echarts-setup.js', () => ({
  getECharts: () => ({ init: initMock, registerMap: registerMapMock }),
}));
vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));
vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => undefined,
    useRenderScope: () => undefined,
  };
});
vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
  Spinner: () => <span data-testid="spinner" />,
}));

const { EChartsRenderer } = await import('../echarts-renderer.js');

function createProps(overrides: Record<string, unknown>): RendererComponentProps<EChartsSchema> {
  return {
    id: 'echarts-loading-1',
    path: '$',
    schema: { type: 'echarts', ...overrides } as unknown as EChartsSchema,
    templateNode: {},
    node: {},
    props: { ...overrides },
    meta: { cid: 3 },
    regions: {},
    events: {},
    reactions: {},
    helpers: {},
  } as unknown as RendererComponentProps<EChartsSchema>;
}

beforeEach(() => {
  initMock.mockReset();
  initMock.mockImplementation(() => makeFakeChart());
  registerMapMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('EChartsRenderer loading state (plan 2026-09-28-5 Phase 2)', () => {
  it('renders the status spinner instead of the empty state while loading=true with no option', () => {
    render(<EChartsRenderer {...createProps({ loading: true })} />);

    const loading = document.querySelector('[data-slot="echarts-loading"]');
    expect(loading).toBeTruthy();
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('flux.common.loading')).toBeTruthy();
    expect(document.querySelector('[data-slot="echarts-empty"]')).toBeNull();
  });

  it('renders the status spinner over a populated option while loading=true', () => {
    render(
      <EChartsRenderer
        {...createProps({
          loading: true,
          option: { series: [{ type: 'bar', data: [1, 2, 3] }] },
        })}
      />,
    );

    expect(document.querySelector('[data-slot="echarts-loading"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="echarts-canvas"]')).toBeNull();
  });

  it('shows the empty state once loading resolves with still-empty data', () => {
    render(<EChartsRenderer {...createProps({ loading: false })} />);

    expect(document.querySelector('[data-slot="echarts-loading"]')).toBeNull();
    expect(document.querySelector('[data-slot="echarts-empty"]')).toBeTruthy();
  });

  // plan 839 N1 regression: the chunk promise resolves while loading=true, the
  // init effect finds no canvas container (spinner branch renders none) and
  // used to bail forever because `loading` was not an effect dependency —
  // the chart stayed blank after loading resolved.
  it('initializes the chart once loading resolves with a populated option', async () => {
    const option = { series: [{ type: 'bar', data: [1, 2, 3] }] };
    const { rerender } = render(
      <EChartsRenderer {...createProps({ loading: true, option })} />,
    );

    // Flush the chunk promise while still loading: the old implementation
    // gave up here (container is null) and never retried.
    await act(async () => {
      await Promise.resolve();
    });
    expect(initMock).not.toHaveBeenCalled();

    rerender(<EChartsRenderer {...createProps({ loading: false, option })} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.querySelector('[data-slot="echarts-canvas"]')).toBeTruthy();
    expect(initMock).toHaveBeenCalledTimes(1);
    const exposed = (
      window as unknown as Record<string, { chart: unknown } | undefined>
    )['__flux_echarts_echarts-loading-1'];
    expect(exposed?.chart).toBeTruthy();
  });
});

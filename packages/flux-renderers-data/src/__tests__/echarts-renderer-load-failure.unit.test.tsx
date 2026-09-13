import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { EChartsSchema } from '../echarts-schemas.js';

const mockInit = vi.fn(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => undefined,
}));

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

function createProps(overrides: Record<string, unknown>): RendererComponentProps<EChartsSchema> {
  return {
    id: 'echarts-fail-1',
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

afterEach(() => {
  cleanup();
  vi.doUnmock('../echarts-setup.js');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('EChartsRenderer chunk load failure', () => {
  it('renders the error placeholder when the echarts chunk fails to load', async () => {
    vi.doMock('../echarts-setup.js', () => {
      throw new Error('echarts chunk unavailable');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { EChartsRenderer } = await import('../echarts-renderer.js');
    const { container } = render(
      <EChartsRenderer {...createProps({ option: { series: [] } })} />,
    );

    await vi.waitFor(() => {
      const errorSlot = container.querySelector('[data-slot="echarts-error"]');
      if (!errorSlot) {
        throw new Error('error placeholder not rendered yet');
      }
    });
    expect(mockInit).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('renders the error placeholder when the optional echarts peer is absent (module not found)', async () => {
    vi.doMock('../echarts-setup.js', () => {
      throw new Error("Cannot find package 'echarts'");
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { EChartsRenderer } = await import('../echarts-renderer.js');
    const { container } = render(
      <EChartsRenderer {...createProps({ option: { series: [] } })} />,
    );

    await vi.waitFor(() => {
      const errorSlot = container.querySelector('[data-slot="echarts-error"]');
      if (!errorSlot) {
        throw new Error('error placeholder not rendered yet');
      }
    });
    expect(mockInit).not.toHaveBeenCalled();
  });
});

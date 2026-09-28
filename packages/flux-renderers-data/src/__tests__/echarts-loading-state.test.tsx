import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { EChartsSchema } from '../echarts-schemas.js';

// plan 2026-09-28-5 Phase 2: loading must outrank the empty state (same
// priority contract as chart-renderer) so first async loads show a spinner
// instead of a "no data" flash.
vi.mock('../echarts-setup.js', () => ({}));
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
});

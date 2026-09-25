import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { BaseSchema, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { inputCityRendererDefinition } from '../definitions.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

const REGION_TREE: Record<string, Array<Record<string, unknown>>> = {
  '': [
    { id: '110000', name: 'Beijing', type: 'province' },
    { id: '310000', name: 'Shanghai', type: 'province' },
  ],
  '110000': [{ id: '110100', name: 'Beijing City', type: 'city' }],
  '110100': [
    { id: '110101', name: 'Dongcheng', type: 'district' },
    { id: '110102', name: 'Xicheng', type: 'district' },
  ],
};

function regionFetcher(options?: { failChildren?: boolean; resolvedNode?: Record<string, unknown> }) {
  return vi.fn(async (api: { url: string }) => {
    const url = new URL(String(api.url), 'http://mock.local');
    if (url.pathname.endsWith('/children')) {
      if (options?.failChildren) {
        return { status: 500, message: 'down' };
      }
      const nodeId = url.searchParams.get('orgNodeId') ?? '';
      return { status: 0, data: { nodes: REGION_TREE[nodeId] ?? [] } };
    }
    if (url.pathname.endsWith('/resolve')) {
      return { status: 0, data: { nodes: options?.resolvedNode ? [options.resolvedNode] : [] } };
    }
    return { status: 404, data: null };
  }) as unknown as RendererEnv['fetcher'];
}

const CHILDREN_SOURCE = {
  action: 'ajax',
  args: {
    url: '/api/region/children',
    params: {
      orgNodeId: '${orgNodeId}',
      orgDepth: '${orgDepth}',
      orgPage: '${orgPage}',
      orgPageSize: '${orgPageSize}',
    },
  },
};

function renderRegionForm(body: Array<Record<string, unknown>>, fetcher: RendererEnv['fetcher']) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/input-city"
      schema={{ type: 'form', body } as unknown as BaseSchema}
      env={{ ...env, fetcher } as RendererEnv}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function openPanel() {
  fireEvent.click(document.querySelector('[data-slot="region-trigger"]') as HTMLElement);
}

function nodesIn(panel: HTMLElement, id: string): HTMLElement {
  const el = panel.querySelector(`[data-slot="region-node"][data-node-id="${id}"]`);
  expect(el, `region node '${id}' must render`).toBeTruthy();
  return el as HTMLElement;
}

describe('input-city definition contract face (plan 506 closure r2)', () => {
  it('narrowed accepted keys exclude the four OrgSelect-only fields', () => {
    const accepted = (inputCityRendererDefinition.fields ?? []).map((rule) => rule.key as string);
    for (const key of ['sourceSearch', 'multiple', 'searchable', 'searchMergeMode']) {
      expect(accepted).not.toContain(key);
    }
    for (const key of ['options', 'sourceChildren', 'sourceResolve', 'selectableTypes', 'pageSize', 'extraParams']) {
      expect(accepted).toContain(key);
    }
  });
});

describe('input-city renderer (missing-components L2.1 region line, plan 506)', () => {
  it('drills province → city → district through lazy columns', async () => {
    renderRegionForm(
      [
        { type: 'input-city', name: 'region', label: 'Region', sourceChildren: CHILDREN_SOURCE },
        { type: 'form-state-probe', name: 'region' },
      ],
      regionFetcher(),
    );
    openPanel();
    const panel = document.querySelector('[data-slot="region-panel"]') as HTMLElement;
    await waitFor(() => expect(nodesIn(panel, '110000')).toBeTruthy(), { timeout: 3000 });

    fireEvent.click(nodesIn(panel, '110000').querySelector('[data-slot="region-node-expand"]') as HTMLElement);
    await waitFor(() => expect(nodesIn(panel, '110100')).toBeTruthy(), { timeout: 3000 });

    fireEvent.click(nodesIn(panel, '110100').querySelector('[data-slot="region-node-expand"]') as HTMLElement);
    await waitFor(() => expect(nodesIn(panel, '110101')).toBeTruthy(), { timeout: 3000 });

    // All levels selectable (protocol §3 region default): commit the district.
    fireEvent.click(nodesIn(panel, '110101').querySelector('[data-slot="region-node-name"]') as HTMLElement);
    const probe = document.querySelector('[data-testid="form-state:region"]');
    await waitFor(() => expect(probe?.textContent).toBe('"110101"'), { timeout: 3000 });
  });

  it('commits a province directly when its name is clicked', async () => {
    renderRegionForm(
      [
        { type: 'input-city', name: 'region2', label: 'Region', sourceChildren: CHILDREN_SOURCE },
        { type: 'form-state-probe', name: 'region2' },
      ],
      regionFetcher(),
    );
    openPanel();
    const panel = document.querySelector('[data-slot="region-panel"]') as HTMLElement;
    await waitFor(() => expect(nodesIn(panel, '310000')).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(nodesIn(panel, '310000').querySelector('[data-slot="region-node-name"]') as HTMLElement);
    const probe = document.querySelector('[data-testid="form-state:region2"]');
    await waitFor(() => expect(probe?.textContent).toBe('"310000"'), { timeout: 3000 });
  });

  it('echoes the initial value as a path from extra.path (protocol §3 extra read)', async () => {
    renderRegionForm(
      [
        {
          type: 'input-city',
          name: 'regionEcho',
          label: 'Region',
          value: '110101',
          sourceResolve: {
            action: 'ajax',
            args: { url: '/api/region/resolve', params: { orgValues: '${orgValues}' } },
          },
        },
      ],
      regionFetcher({
        resolvedNode: {
          id: '110101',
          name: 'Dongcheng',
          type: 'district',
          extra: {
            path: [
              { id: '110000', name: 'Beijing' },
              { id: '110100', name: 'Beijing City' },
              { id: '110101', name: 'Dongcheng' },
            ],
          },
        },
      }),
    );
    await waitFor(
      () => {
        expect(document.querySelector('[data-slot="region-value"]')?.textContent).toBe(
          'Beijing / Beijing City / Dongcheng',
        );
      },
      { timeout: 3000 },
    );
  });

  it('falls back to the raw value when the resolved node carries no path', async () => {
    renderRegionForm(
      [
        {
          type: 'input-city',
          name: 'regionRaw',
          label: 'Region',
          value: '999999',
          sourceResolve: {
            action: 'ajax',
            args: { url: '/api/region/resolve', params: { orgValues: '${orgValues}' } },
          },
        },
      ],
      regionFetcher({ resolvedNode: { id: '999999', name: 'Mystery', type: 'district' } }),
    );
    await waitFor(
      () => {
        expect(document.querySelector('[data-slot="region-value"]')?.textContent).toBe('999999');
      },
      { timeout: 3000 },
    );
  });

  it('shows an inline error with retry when children loading fails, then recovers', async () => {
    let failing = true;
    const fetcher = vi.fn(async (api: { url: string }) => {
      if (failing) {
        return { status: 500, message: 'down' };
      }
      const url = new URL(String(api.url), 'http://mock.local');
      const nodeId = url.searchParams.get('orgNodeId') ?? '';
      return { status: 0, data: { nodes: REGION_TREE[nodeId] ?? [] } };
    }) as unknown as RendererEnv['fetcher'];
    renderRegionForm(
      [{ type: 'input-city', name: 'regionX', label: 'Region', sourceChildren: CHILDREN_SOURCE }],
      fetcher,
    );
    openPanel();
    await waitFor(() => expect(document.querySelector('[data-slot="region-error"]')).toBeTruthy(), {
      timeout: 3000,
    });
    failing = false;
    fireEvent.click(document.querySelector('[data-slot="region-retry"]') as HTMLElement);
    const panel = document.querySelector('[data-slot="region-panel"]') as HTMLElement;
    await waitFor(() => expect(nodesIn(panel, '110000')).toBeTruthy(), { timeout: 3000 });
  });

  it('empty branch shows the empty column state when a level has no children (city-empty-level)', async () => {
    renderRegionForm(
      [{ type: 'input-city', name: 'regionE', label: 'Region', sourceChildren: CHILDREN_SOURCE }],
      regionFetcher(),
    );
    openPanel();
    const panel = document.querySelector('[data-slot="region-panel"]') as HTMLElement;
    await waitFor(() => expect(nodesIn(panel, '310000')).toBeTruthy(), { timeout: 3000 });
    // Shanghai has no children in the mock tree: drilling in shows the empty state.
    fireEvent.click(nodesIn(panel, '310000').querySelector('[data-slot="region-node-expand"]') as HTMLElement);
    await waitFor(() => expect(panel.querySelector('[data-slot="region-empty"]')).toBeTruthy(), { timeout: 3000 });
  });

  it('no sources renders the empty column without dispatching (city-root-no-source)', async () => {
    const fetcher = vi.fn(async () => ({ status: 0, data: { nodes: [] } }));
    renderRegionForm([{ type: 'input-city', name: 'bare', label: 'Bare' }], fetcher as unknown as RendererEnv['fetcher']);
    openPanel();
    await waitFor(
      () => expect(document.querySelector('[data-slot="region-empty"]')).toBeTruthy(),
      { timeout: 3000 },
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('clearable trigger resets the value (probe reads null after clear)', async () => {
    renderRegionForm(
      [
        {
          type: 'input-city',
          name: 'regionClear',
          label: 'Region',
          clearable: true,
          options: [{ id: '440100', name: 'Guangzhou', type: 'city' }],
        },
        { type: 'form-state-probe', name: 'regionClear' },
      ],
      regionFetcher(),
    );
    openPanel();
    const panel = document.querySelector('[data-slot="region-panel"]') as HTMLElement;
    await waitFor(() => expect(panel.querySelector('[data-node-id="440100"]')).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(panel.querySelector('[data-node-id="440100"] [data-slot="region-node-name"]') as HTMLElement);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="region-value"]')?.textContent).toContain('Guangzhou');
    }, { timeout: 3000 });
    fireEvent.click(document.querySelector('[data-slot="region-clear"]') as HTMLElement);
    await waitFor(() => {
      const probe = document.querySelector('[data-testid="form-state:regionClear"]');
      expect(probe?.textContent).toBe('null');
    }, { timeout: 3000 });
  });
});

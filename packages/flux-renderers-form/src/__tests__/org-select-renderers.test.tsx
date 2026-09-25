import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { BaseSchema, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

const ORG_TREE = {
  children: [
    { id: 'd1', name: 'Engineering', type: 'department' },
    { id: 'd2', name: 'Finance', type: 'department' },
  ],
  'd1': [
    { id: 'u1', name: 'Alice', type: 'user' },
    { id: 'u2', name: 'Bob', type: 'user' },
    { id: 'd11', name: 'Platform', type: 'department' },
  ],
  'd2': [{ id: 'u3', name: 'Carol', type: 'user', disabled: true }],
  search: [
    { id: 'u1', name: 'Alice', type: 'user' },
    { id: 'u3', name: 'Carol', type: 'user', disabled: true },
  ],
  resolve: [{ id: 'u9', name: 'Remote User', type: 'user' }],
};

const CHILDREN_SOURCE = {
  action: 'ajax',
  args: {
    url: '/api/org/children',
    params: {
      orgNodeId: '${orgNodeId}',
      orgDepth: '${orgDepth}',
      orgPage: '${orgPage}',
      orgPageSize: '${orgPageSize}',
    },
  },
};
const SEARCH_SOURCE = {
  action: 'ajax',
  args: {
    url: '/api/org/search',
    params: { searchQuery: '${searchQuery}', orgPage: '${orgPage}', orgPageSize: '${orgPageSize}' },
  },
};
const RESOLVE_SOURCE = {
  action: 'ajax',
  args: { url: '/api/org/resolve', params: { orgValues: '${orgValues}' } },
};

function orgFetcher(returnError = false) {
  return vi.fn(async (api: { url: string; params?: Record<string, unknown> }) => {
    if (returnError) {
      return { status: 500, message: 'backend down' };
    }
    // The ajax action serializes args.params into the URL query string.
    const url = new URL(String(api.url), 'http://mock.local');
    const nodeId = url.searchParams.get('orgNodeId') ?? '';
    const path = url.pathname;
    if (path.endsWith('/children')) {
      const nodes = nodeId === '' ? ORG_TREE.children : ORG_TREE[nodeId as keyof typeof ORG_TREE];
      return { status: 0, data: { nodes: nodes ?? [] } };
    }
    if (path.endsWith('/search')) {
      return { status: 0, data: { nodes: ORG_TREE.search } };
    }
    if (path.endsWith('/resolve')) {
      return { status: 0, data: { nodes: ORG_TREE.resolve } };
    }
    return { status: 404, data: null };
  }) as unknown as RendererEnv['fetcher'];
}

function renderOrgForm(body: Array<Record<string, unknown>>, fetcher: RendererEnv['fetcher']) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer, buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/org-select"
      schema={{ type: 'form', body } as unknown as BaseSchema}
      env={{ ...env, fetcher } as RendererEnv}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function probeText(name: string): string {
  const probe = document.querySelector(`[data-testid="form-state:${name}"]`);
  expect(probe, `probe for '${name}' must render`).toBeTruthy();
  return probe!.textContent ?? '';
}

function openPanel() {
  fireEvent.click(document.querySelector('[data-slot="org-select-trigger"]') as HTMLElement);
}

function nodeRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-slot="org-select-node"]'));
}

function row(id: string): HTMLElement {
  const row = nodeRows().find((entry) => entry.getAttribute('data-node-id') === id);
  expect(row, `node row '${id}' must render`).toBeTruthy();
  return row!;
}

async function flushSearch() {
  await waitFor(() => expect(document.querySelectorAll('[data-slot="org-select-node"]').length).toBeGreaterThan(0), {
    timeout: 3000,
  });
}

describe('user-select renderer (missing-components L2.1)', () => {
  it('selects a static option (single) and shows its label on the trigger', async () => {
    renderOrgForm(
      [
        {
          type: 'user-select',
          name: 'owner',
          label: 'Owner',
          clearable: true,
          options: [
            { id: 'u1', name: 'Alice', type: 'user' },
            { id: 'u2', name: 'Bob', type: 'user' },
          ],
        },
        { type: 'form-state-probe', name: 'owner' },
      ],
      orgFetcher(),
    );
    openPanel();
    fireEvent.click(row('u1').querySelector('[data-slot="org-select-node-name"]') as HTMLElement);
    await waitFor(() => expect(probeText('owner')).toBe('"u1"'));
    expect(document.querySelector('[data-slot="org-select-value"]')?.textContent).toContain('Alice');
  });

  it('clearable trigger resets the value to undefined', async () => {
    renderOrgForm(
      [
        {
          type: 'user-select',
          name: 'owner2',
          label: 'Owner',
          clearable: true,
          value: 'u1',
          options: [{ id: 'u1', name: 'Alice', type: 'user' }],
        },
        { type: 'form-state-probe', name: 'owner2' },
      ],
      orgFetcher(),
    );
    // Echo label reads the bound-value hook (schema initial values reach the
    // store asynchronously — lessons/12 — so the template probe lags a frame).
    await waitFor(() => {
      expect(document.querySelector('[data-slot="org-select-value"]')?.textContent).toContain('Alice');
    }, { timeout: 3000 });
    fireEvent.click(document.querySelector('[data-slot="org-select-clear"]') as HTMLElement);
    await waitFor(() => expect(probeText('owner2')).toBe('null'));
  });

  it('multiple mode commits an array of ids via checkboxes', async () => {
    renderOrgForm(
      [
        {
          type: 'user-select',
          name: 'team',
          label: 'Team',
          multiple: true,
          options: [
            { id: 'u1', name: 'Alice', type: 'user' },
            { id: 'u2', name: 'Bob', type: 'user' },
          ],
        },
        { type: 'form-state-probe', name: 'team' },
      ],
      orgFetcher(),
    );
    openPanel();
    fireEvent.click(row('u1').querySelector('[data-slot="org-select-node-check"]') as HTMLElement);
    fireEvent.click(row('u2').querySelector('[data-slot="org-select-node-check"]') as HTMLElement);
    await waitFor(() => expect(probeText('team')).toBe('["u1","u2"]'));
    expect(document.querySelectorAll('[data-slot="org-select-chip"]')).toHaveLength(2);
    fireEvent.click(row('u1').querySelector('[data-slot="org-select-node-check"]') as HTMLElement);
    await waitFor(() => expect(probeText('team')).toBe('["u2"]'));
  });

  it('department rows are navigable-only by default (selectableTypes [user])', async () => {
    renderOrgForm(
      [{ type: 'user-select', name: 'member', label: 'Member', sourceChildren: CHILDREN_SOURCE }, { type: 'form-state-probe', name: 'member' }],
      orgFetcher(),
    );
    openPanel();
    await waitFor(() => expect(nodeRows().length).toBeGreaterThan(0), { timeout: 3000 });
    expect(row('d1').querySelector('[data-slot="org-select-node-check"]')).toBeNull();
    fireEvent.click(row('d1').querySelector('[data-slot="org-select-expand"]') as HTMLElement);
    await waitFor(() => expect(row('u1').textContent).toContain('Alice'), { timeout: 3000 });
    fireEvent.click(row('u1').querySelector('[data-slot="org-select-node-name"]') as HTMLElement);
    await waitFor(() => expect(probeText('member')).toBe('"u1"'));
  });

  it('disabled user nodes render non-selectable with disabledTip available', async () => {
    renderOrgForm(
      [{ type: 'user-select', name: 'pick', label: 'Pick', sourceChildren: CHILDREN_SOURCE }],
      orgFetcher(),
    );
    openPanel();
    await waitFor(() => expect(row('d2')).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(row('d2').querySelector('[data-slot="org-select-expand"]') as HTMLElement);
    await waitFor(() => expect(row('u3').getAttribute('data-disabled')).toBe('true'), { timeout: 3000 });
    expect(row('u3').querySelector('[data-slot="org-select-node-check"]')?.hasAttribute('data-disabled')).toBe(true);
  });

  it('resolves unseen selected values through sourceResolve for the trigger label', async () => {
    renderOrgForm(
      [
        {
          type: 'user-select',
          name: 'echoed',
          label: 'Echoed',
          value: 'u9',
          sourceResolve: RESOLVE_SOURCE,
        },
        { type: 'form-state-probe', name: 'echoed' },
      ],
      orgFetcher(),
    );
    await waitFor(() => {
      expect(document.querySelector('[data-slot="org-select-value"]')?.textContent).toContain('Remote User');
    }, { timeout: 3000 });
  });

  it('remote search merges after local matches (append default) and supports replace', async () => {
    const { unmount } = renderOrgForm(
      [
        {
          type: 'user-select',
          name: 'find',
          label: 'Find',
          options: [{ id: 'u1', name: 'Alice', type: 'user' }],
          sourceSearch: SEARCH_SOURCE,
        },
      ],
      orgFetcher(),
    );
    openPanel();
    fireEvent.input(document.querySelector('[data-slot="org-select-search"]') as HTMLElement, {
      target: { value: 'ali' },
    });
    await flushSearch();
    expect(row('u1')).toBeTruthy();
    unmount();

    const { unmount: unmount2 } = renderOrgForm(
      [
        {
          type: 'user-select',
          name: 'find2',
          label: 'Find',
          searchMergeMode: 'replace',
          options: [{ id: 'u1', name: 'Alice', type: 'user' }],
          sourceSearch: SEARCH_SOURCE,
        },
      ],
      orgFetcher(),
    );
    openPanel();
    fireEvent.input(document.querySelector('[data-slot="org-select-search"]') as HTMLElement, {
      target: { value: 'ali' },
    });
    await flushSearch();
    expect(document.querySelectorAll('[data-slot="org-select-node"]')).toHaveLength(ORG_TREE.search.length);
    unmount2();
  });

  it('search failure surfaces the orgSearchFailed error row', async () => {
    renderOrgForm(
      [{ type: 'user-select', name: 'findx', label: 'Find', sourceSearch: SEARCH_SOURCE }],
      orgFetcher(true),
    );
    openPanel();
    fireEvent.input(document.querySelector('[data-slot="org-select-search"]') as HTMLElement, {
      target: { value: 'x' },
    });
    await waitFor(() => expect(document.querySelector('[data-slot="org-select-error"]')).toBeTruthy(), {
      timeout: 3000,
    });
    expect(document.querySelector('[data-slot="org-select-error"]')?.textContent).toContain('Search failed');
  });

  it('no options and no sourceChildren renders the empty state without dispatching (org-root-no-source)', async () => {
    const fetcher = vi.fn(async () => ({ status: 0, data: { nodes: [] } }));
    renderOrgForm([{ type: 'user-select', name: 'bare', label: 'Bare' }], fetcher as unknown as RendererEnv['fetcher']);
    openPanel();
    await waitFor(
      () => expect(document.querySelector('[data-slot="org-select-empty"]')).toBeTruthy(),
      { timeout: 3000 },
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('schema-disabled fields render a disabled trigger', () => {
    renderOrgForm(
      [
        {
          type: 'user-select',
          name: 'frozen',
          label: 'Frozen',
          disabled: true,
          options: [{ id: 'u1', name: 'Alice', type: 'user' }],
        },
      ],
      orgFetcher(),
    );
    expect(document.querySelector('[data-slot="org-select-trigger"]')?.hasAttribute('disabled')).toBe(true);
  });
});

describe('department-select renderer (missing-components L2.1)', () => {
  it('lazy-loads departments and selects one (single)', async () => {
    renderOrgForm(
      [
        {
          type: 'department-select',
          name: 'dept',
          label: 'Dept',
          sourceChildren: CHILDREN_SOURCE,
        },
        { type: 'form-state-probe', name: 'dept' },
      ],
      orgFetcher(),
    );
    openPanel();
    await waitFor(() => expect(row('d1')).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(row('d1').querySelector('[data-slot="org-select-node-name"]') as HTMLElement);
    await waitFor(() => expect(probeText('dept')).toBe('"d1"'));
  });

  it('multiple mode with lazy expansion commits checked department ids', async () => {
    renderOrgForm(
      [
        {
          type: 'department-select',
          name: 'depts',
          label: 'Depts',
          multiple: true,
          sourceChildren: CHILDREN_SOURCE,
        },
        { type: 'form-state-probe', name: 'depts' },
      ],
      orgFetcher(),
    );
    openPanel();
    await waitFor(() => expect(row('d1')).toBeTruthy(), { timeout: 3000 });
    fireEvent.click(row('d1').querySelector('[data-slot="org-select-node-check"]') as HTMLElement);
    fireEvent.click(row('d2').querySelector('[data-slot="org-select-node-check"]') as HTMLElement);
    await waitFor(() => expect(probeText('depts')).toBe('["d1","d2"]'));
    fireEvent.click(row('d1').querySelector('[data-slot="org-select-expand"]') as HTMLElement);
    await waitFor(() => expect(row('u1')).toBeTruthy(), { timeout: 3000 });
    expect(probeText('depts')).toBe('["d1","d2"]');
  });

  it('children fetch failure offers an inline retry that recovers', async () => {
    let failing = true;
    const fetcher = vi.fn(async (api: { url: string; params?: Record<string, unknown> }) => {
      if (failing) {
        return { status: 500, message: 'down' };
      }
      const url = new URL(String(api.url), 'http://mock.local');
      const nodeId = url.searchParams.get('orgNodeId') ?? '';
      const nodes = nodeId === '' ? ORG_TREE.children : ORG_TREE[nodeId as keyof typeof ORG_TREE];
      return { status: 0, data: { nodes: nodes ?? [] } };
    }) as unknown as RendererEnv['fetcher'];
    renderOrgForm(
      [
        {
          type: 'department-select',
          name: 'deptx',
          label: 'Dept',
          sourceChildren: CHILDREN_SOURCE,
        },
      ],
      fetcher,
    );
    openPanel();
    await waitFor(() => expect(document.querySelector('[data-slot="org-select-error"]')).toBeTruthy(), {
      timeout: 3000,
    });
    failing = false;
    fireEvent.click(document.querySelector('[data-slot="org-select-retry"]') as HTMLElement);
    await waitFor(() => expect(row('d1')).toBeTruthy(), { timeout: 3000 });
  });
});

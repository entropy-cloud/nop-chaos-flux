// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition, RendererEnv, SchemaValue } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

function renderStatus(body: SchemaValue, schemaUrl: string, data?: Record<string, unknown>) {
  const SchemaRenderer = createContentSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl={schemaUrl}
      schema={{ type: 'page', body }}
      data={data ?? {}}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('StatusRenderer (W3c — business status display, Badge semantic layer)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the nop-status marker with data-slot status-root', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 's1',
          value: 'ok',
          labelMap: { ok: 'OK' },
        },
      ],
      'test://status/marker',
    );
    const root = container.querySelector('[data-testid="s1"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('status-root');
    expect(root.className).toContain('nop-status');
    expect(root.getAttribute('data-state')).toBe('hit');
    expect(root.querySelector('[data-slot="status-badge"]')).toBeTruthy();
  });

  it('renders label from labelMap (status labelMap text)', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 's1',
          value: 'done',
          labelMap: { done: 'Completed', todo: 'To Do' },
        },
      ],
      'test://status/label',
    );
    expect(container.querySelector('[data-testid="s1"] [data-slot="status-badge"]')?.textContent).toBe(
      'Completed',
    );
  });

  it('projects levelMap to Badge variant classes (status-level)', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 'success',
          value: 'done',
          labelMap: { done: 'Done' },
          levelMap: { done: 'success' },
        },
        {
          type: 'status',
          testid: 'warn',
          value: 'pending',
          labelMap: { pending: 'Pending' },
          levelMap: { pending: 'warning' },
        },
        {
          type: 'status',
          testid: 'error',
          value: 'failed',
          labelMap: { failed: 'Failed' },
          levelMap: { failed: 'error' },
        },
      ],
      'test://status/levels',
    );
    expect(container.querySelector('[data-testid="success"]')?.getAttribute('data-level')).toBe(
      'success',
    );
    expect(
      container
        .querySelector('[data-testid="success"] [data-slot="status-badge"]')
        ?.className.split(' ')
        .some((c) => c.startsWith('bg-emerald')),
    ).toBe(true);

    expect(container.querySelector('[data-testid="warn"]')?.getAttribute('data-level')).toBe(
      'warning',
    );
    expect(
      container
        .querySelector('[data-testid="warn"] [data-slot="status-badge"]')
        ?.className.split(' ')
        .some((c) => c.startsWith('bg-amber')),
    ).toBe(true);

    expect(container.querySelector('[data-testid="error"]')?.getAttribute('data-level')).toBe(
      'error',
    );
    expect(
      container
        .querySelector('[data-testid="error"] [data-slot="status-badge"]')
        ?.className.split(' ')
        .some((c) => c.startsWith('bg-destructive')),
    ).toBe(true);
  });

  it('defaults to secondary variant when level omitted or unknown', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 's1',
          value: 'ok',
          labelMap: { ok: 'OK' },
        },
      ],
      'test://status/default-level',
    );
    expect(container.querySelector('[data-testid="s1"]')?.getAttribute('data-level')).toBe(
      'default',
    );
    expect(
      container
        .querySelector('[data-testid="s1"] [data-slot="status-badge"]')
        ?.className.split(' ')
        .some((c) => c.startsWith('bg-secondary')),
    ).toBe(true);
  });

  it('renders icon from iconMap (status-icon)', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 's1',
          value: 'done',
          labelMap: { done: 'Done' },
          iconMap: { done: 'check' },
        },
      ],
      'test://status/icon',
    );
    const badge = container.querySelector('[data-testid="s1"] [data-slot="status-badge"]');
    expect(badge?.querySelector('svg')).toBeTruthy();
  });

  it('does not render icon when iconMap missing the key', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 's1',
          value: 'done',
          labelMap: { done: 'Done' },
          iconMap: { other: 'check' },
        },
      ],
      'test://status/no-icon',
    );
    expect(
      container.querySelector('[data-testid="s1"] [data-slot="status-badge"]')?.querySelector('svg'),
    ).toBeNull();
  });

  it('renders placeholder when value misses labelMap (status-miss)', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 's1',
          value: 'unknown',
          labelMap: { done: 'Done' },
          placeholder: 'N/A',
        },
      ],
      'test://status/miss',
    );
    const root = container.querySelector('[data-testid="s1"]') as HTMLElement;
    expect(root.getAttribute('data-state')).toBe('miss');
    expect(root.textContent).toBe('N/A');
    expect(root.querySelector('[data-slot="status-badge"]')).toBeNull();
  });

  it('renders placeholder for empty/null/undefined value without throwing (null-value)', () => {
    const { container } = renderStatus(
      [
        { type: 'status', testid: 'empty', value: '', labelMap: {}, placeholder: 'N/A' },
        { type: 'status', testid: 'null', value: null, labelMap: {}, placeholder: 'N/A' },
        { type: 'status', testid: 'undef', labelMap: { ok: 'OK' }, placeholder: 'N/A' },
      ],
      'test://status/empty',
    );
    for (const id of ['empty', 'null', 'undef']) {
      const root = container.querySelector(`[data-testid="${id}"]`) as HTMLElement;
      expect(root.getAttribute('data-state')).toBe('miss');
      expect(root.textContent).toBe('N/A');
      expect(root.querySelector('[data-slot="status-badge"]')).toBeNull();
    }
  });

  it('renders nothing when value misses and no placeholder configured', () => {
    const { container } = renderStatus(
      [{ type: 'status', testid: 's1', value: 'unknown', labelMap: { done: 'Done' } }],
      'test://status/miss-empty',
    );
    const root = container.querySelector('[data-testid="s1"]') as HTMLElement;
    expect(root.getAttribute('data-state')).toBe('miss');
    expect(root.textContent).toBe('');
  });

  it('renders a hit value bound from an expression resolved against scope data', () => {
    const { container } = renderStatus(
      [
        {
          type: 'status',
          testid: 's1',
          value: '${state}',
          labelMap: { running: 'Running', stopped: 'Stopped' },
          levelMap: { running: 'success', stopped: 'error' },
        },
      ],
      'test://status/expr',
      { state: 'running' },
    );
    expect(container.querySelector('[data-testid="s1"]')?.getAttribute('data-state')).toBe('hit');
    expect(container.querySelector('[data-testid="s1"]')?.getAttribute('data-level')).toBe(
      'success',
    );
    expect(
      container.querySelector('[data-testid="s1"] [data-slot="status-badge"]')?.textContent,
    ).toBe('Running');
  });
});

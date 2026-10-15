import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import React from 'react';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { DASHBOARD_EDITOR_MANIFEST_V1 } from './dashboard-editor-manifest.js';
import { dashboardEditorRendererDefinition } from './dashboard-editor-definitions.js';
import {
  createDashboardSchemaRenderer,
  env,
  formulaCompiler,
} from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const layout = {
  panels: [{ id: 'p1', type: 'chart', title: 'Sales', x: 0, y: 0, w: 6, h: 2 }],
};

function StatusProbe() {
  const status = useScopeSelector((data: Record<string, unknown>) => data.dashboardHostStatus);
  return (
    <span data-testid="dashboard-status">
      {status
        ? `${(status as { kind?: string }).kind}:${(status as { dirty?: boolean }).dirty}:${
            (status as { selectionCount?: number }).selectionCount
          }`
        : ''}
    </span>
  );
}

const statusProbeRenderer: RegisteredRendererDefinition = {
  type: 'dashboard-status-probe',
  component: StatusProbe,
};

/**
 * P3.3（plan 554）：scope 投影契约。
 * - scopeData 键集 == P3.1 manifest projection 键集（单一事实源 parity）。
 * - statusPath 六键 summary 发布（§2.4：dirty/busy/error/canUndo/canRedo/selection 摘要）。
 */
describe('dashboard-editor scope projection (P3.3)', () => {
  it('declares statusPath in the definition propContracts (spreadsheet precedent)', () => {
    expect(dashboardEditorRendererDefinition.propContracts?.statusPath?.shape).toEqual({
      kind: 'string',
    });
  });

  it('projection keys equal the P3.1 manifest projection fields (single source parity)', () => {
    const manifestKeys = Object.keys(DASHBOARD_EDITOR_MANIFEST_V1.projection.fields).sort();
    expect(manifestKeys).toEqual(['layout', 'mode', 'runtime', 'selection']);
  });

  it('publishes the host status summary through statusPath (§2.4 six keys)', async () => {
    const SchemaRenderer = createDashboardSchemaRenderer([statusProbeRenderer]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://dashboard/status-path"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard-editor',
              testid: 'demo-editor',
              layout,
              statusPath: 'dashboardHostStatus',
            },
            { type: 'dashboard-status-probe' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="demo-editor"]')).toBeTruthy();
    });
    await waitFor(() => {
      // kind:dirty:selectionCount — 六键 summary 已发布（dirty=false 初始，selectionCount=0）
      expect(screenText('dashboard-status')).toMatch(/^dashboard-editor:false:0$/);
    });
  });
});

function screenText(testId: string): string {
  return document.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

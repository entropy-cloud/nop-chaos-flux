/**
 * ReportInspectorShellRenderer 三态单元测试（plan 528 Phase 3 Proof）：
 * 空态卡（图标 + noSelection 文案，data-testid=report-inspector-empty）、
 * 加载骨架（aria-busy + sr-only 文案，data-testid=report-inspector-loading）、
 * 错误卡（图标 + 错误文案，data-testid=report-inspector-error）。
 */

import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { registerReportDesignerRenderers } from './index.js';

afterEach(() => {
  cleanup();
});

const env: RendererEnv = {
  fetcher: async <T,>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

function renderShell(scopeData: Record<string, unknown>, schemaOverrides: Record<string, unknown> = {}) {
  const registry = createDefaultRegistry([textRenderer]);
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  const schema = {
    type: 'report-inspector-shell' as const,
    title: 'Inspector',
    ...schemaOverrides,
  } as unknown as SchemaInput;

  render(
    <SchemaRenderer
      schemaUrl="test://report/inspector-shell"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={scopeData}
    />,
  );
}

describe('ReportInspectorShellRenderer states (plan 528 Phase 3)', () => {
  it('renders the upgraded empty-state card with icon when no target is selected', () => {
    renderShell({ selectionTarget: undefined, inspector: undefined });

    const empty = document.querySelector('[data-testid="report-inspector-empty"]');
    expect(empty).toBeTruthy();
    expect(empty!.querySelector('svg')).toBeTruthy();
    expect(empty!.textContent).toContain('选择一个目标进行检查。');
  });

  it('renders the loading skeleton with aria-busy while panels load', () => {
    renderShell({
      selectionTarget: { kind: 'cell' },
      inspector: { loading: true },
    });

    const loading = document.querySelector('[data-testid="report-inspector-loading"]');
    expect(loading).toBeTruthy();
    expect(loading!.getAttribute('aria-busy')).toBe('true');
    expect(loading!.textContent).toContain('正在加载检查器面板');
  });

  it('renders the error card with the failure detail when panels fail', () => {
    renderShell({
      selectionTarget: { kind: 'cell' },
      inspector: { error: '面板加载炸了' },
    });

    const error = document.querySelector('[data-testid="report-inspector-error"]');
    expect(error).toBeTruthy();
    expect(error!.querySelector('svg')).toBeTruthy();
    expect(error!.textContent).toContain('面板加载炸了');
  });
});

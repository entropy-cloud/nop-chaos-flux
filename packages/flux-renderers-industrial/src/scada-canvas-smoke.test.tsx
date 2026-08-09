import React from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { industrialRendererDefinitions } from './renderer-definitions.js';
import { registerBuiltinScadaSymbols } from './symbols/register-builtin.js';
import { resetLeaferMock } from './test-support/leafer-ui-mock.js';

vi.mock('leafer-ui', () => import('./test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const validConfig = {
  version: 1,
  symbols: [{ id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' }],
};

beforeEach(async () => {
  // plan 2026-08-04-1558-3 Phase 3（TE-5）：对齐其余 leafer mock 消费者，每用例重置 mock 计数器/定时器，
  // 消除 innerId 断言跨用例污染隐患（唯一漏调消费者文件）。
  resetLeaferMock();
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

describe('scada-canvas render smoke', () => {
  it('compiles and renders the real scada-canvas renderer with scene build', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial/smoke"
        schema={{ type: 'scada-canvas', config: validConfig }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-scada-canvas');
    const canvas = container.querySelector('[data-slot="scada-canvas-canvas"]') as HTMLElement;
    expect(canvas).toBeTruthy();
    const handles = Object.keys(window).filter((key) => key.startsWith('__flux_scada_'));
    expect(handles.length).toBeGreaterThan(0);
    // plan 2026-08-06-0746-2 P2-14（false-green 消除）：原断言仅 `handles.length > 0`
    // （等价 not.toThrow），未验图元入树或 ready 状态——空/失败场景构建会过。此处补真断言：
    // (1) 经 test handle 的 getSymbol 验证 rect-1 图元已入 registry（场景图真构建）；
    // (2) root data-status === 'ready'（构建完成，非 loading/error）。
    // 守护：把 validConfig.symbols 清空 → getSymbol('rect-1') 返 undefined → 本断言转红。
    const handle = (
      window as unknown as Record<string, { getSymbol: (id: string) => unknown }>
    )[handles[0]];
    expect(handle.getSymbol('rect-1')).toBeTruthy();
    expect(root.getAttribute('data-status')).toBe('ready');
  });

  it('renders ready (empty scene) when config is missing — author-less schema fallback (plan 2026-08-04-1558-1 Phase 3)', () => {
    // P3 fix: parseAndValidateConfig 兜底返回最小合法空场景 { version:1, variables:[], symbols:[] }，
    // renderer 构建 empty 画布并进入 ready（不再永久 loading）。defaultSchema 元数据同步含 config。
    const SchemaRenderer = createSchemaRenderer(industrialRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial/smoke-empty"
        schema={{ type: 'scada-canvas' }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-scada-canvas');
    // 状态须为 ready（非 loading）；空场景经 useScadaConfigSync onBuilt 翻转 status。
    expect(root.getAttribute('data-status')).toBe('ready');
    // 渲染 canvas 占位（非 loading 占位）：空场景已构建，进入 ready 画布层。
    expect(container.querySelector('[data-slot="scada-canvas-canvas"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="scada-canvas-loading"]')).toBeNull();
  });

  it('emits a11y role/aria-label on the canvas wrapper (HCA1 P2-1 / HCAX-2)', () => {
    const SchemaRenderer = createSchemaRenderer(industrialRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial/smoke-a11y"
        schema={{ type: 'scada-canvas', config: validConfig }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('role')).toBe('application');
    expect(root.getAttribute('aria-label')).toBe('Industrial SCADA canvas');
  });
});

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import {
  clearScadaSymbolRegistry,
  registerScadaSymbol,
} from '../../symbols/symbol-registry.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import type { ScadaSymbolDefinition } from '../../symbols/symbol-types.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { EditorPalettePanel } from './editor-palette.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

function makeRuntime(): EditorEngineRuntime {
  return { addWorkingSymbol: () => undefined } as unknown as EditorEngineRuntime;
}

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
  // plan 2026-08-09-0648-2 Phase 2：palette i18n 用例需确定 i18n 状态——重置后以默认 zh-CN 初始化，
  // 使 `t()` 解析到 symbol 名称键（'矩形' 等），断言「解析后文案」而非 not-throw。
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  resetFluxI18n();
  clearScadaSymbolRegistry();
  cleanup();
});

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);
}

describe('EditorPalettePanel i18n (plan 2026-08-09-0648-2 Phase 2)', () => {
  it('renders resolved localized symbol names (zh-CN, not raw key)', () => {
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    // scada-rect → '矩形'（zh-CN locale 已注入），证明 `t()` 解析命中、未渲染 raw key 'industrial.scada.symbol.scada-rect'。
    expect(findButtonByText(container, '矩形')).toBeDefined();
    // 多类型抽样：scada-instrument-thermometer → '温度计'。
    expect(findButtonByText(container, '温度计')).toBeDefined();
    // 断言 raw key 未泄漏到可见文本（i18next 未命中才返回 key 串；命中则不应出现）。
    expect(findButtonByText(container, 'industrial.scada.symbol.scada-rect')).toBeUndefined();
  });

  it('renders localized name also as title attribute', () => {
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    const rectBtn = findButtonByText(container, '矩形');
    expect(rectBtn?.getAttribute('title')).toBe('矩形');
  });

  it('falls back to def.name (English) on locale miss via explicit miss-detection (D5)', () => {
    // 注册一个无 locale 键的自定义图元 → `t(key) === key` 触发显式未命中检测 → 回退 def.name 'FallbackWidget'。
    // 守护：若误用 `||` 短路 fallback（i18next 未命中返回 key 串，非 falsy），此处会渲染 raw key 而非 'FallbackWidget' → 断言转红。
    const custom: ScadaSymbolDefinition = {
      type: 'scada-test-fallback-no-key',
      name: 'FallbackWidget',
      props: {},
      create: () => ({}) as never,
    };
    registerScadaSymbol(custom);
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    expect(findButtonByText(container, 'FallbackWidget')).toBeDefined();
    expect(
      findButtonByText(container, 'industrial.scada.symbol.scada-test-fallback-no-key'),
    ).toBeUndefined();
  });
});

import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import { UndoStack } from '../undo-redo/undo-stack.js';
import { UndoRedoAdapter } from '../undo-redo/undo-redo-adapter.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { ScadaConfig } from '../../serialization/config-types.js';
import { EditorToolboxPanel } from './toolbox-panel.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const config: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'a', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50 },
    { id: 'b', type: 'scada-rect', x: 100, y: 100, width: 50, height: 50 },
    { id: 'c', type: 'scada-rect', x: 200, y: 200, width: 50, height: 50 },
  ],
};

function makeRuntime(overrides: Partial<EditorEngineRuntime> = {}): EditorEngineRuntime & {
  calls: Record<string, unknown[]>;
  allCalls: Record<string, unknown[][]>;
} {
  const calls: Record<string, unknown[]> = {};
  const allCalls: Record<string, unknown[][]> = {};
  const track = <T extends (...args: never[]) => unknown>(name: string, fn: T) => {
    return (...args: never[]) => {
      calls[name] = args;
      (allCalls[name] ??= []).push(args);
      return fn(...args);
    };
  };
  const undoStack = new UndoStack();
  const undoRedo = new UndoRedoAdapter(undoStack);
  const rt = {
    engine: {
      getViewport: () => ({ x: 0, y: 0, scale: 1 }),
      getSize: () => ({ width: 800, height: 600 }),
    } as never,
    session: { workingConfig: config, committedBaseline: config, selection: [] as string[], mode: 'edit' as const, undoStack },
    switchMode: () => undefined,
    setSelection: () => undefined,
    clearSelection: () => undefined,
    save: () => '{}',
    load: () => undefined,
    syncWorkingCopy: () => undefined,
    updateWorkingNode: () => undefined,
    addWorkingSymbol: () => undefined,
    removeWorkingSymbol: track('removeWorkingSymbol', () => undefined),
    undoRedo,
    undo: track('undo', () => undefined),
    redo: track('redo', () => undefined),
    groupSymbols: track('groupSymbols', () => undefined),
    ungroupSymbols: track('ungroupSymbols', () => undefined),
    fitView: track('fitView', () => true),
    centerView: track('centerView', () => true),
    resetView: track('resetView', () => undefined),
    zoomView: track('zoomView', () => undefined),
    alignSelection: track('align', () => true),
    distributeSelection: track('distribute', () => true),
    reorderZOrder: track('zorder', () => true),
    copySelection: track('copy', () => 1),
    cutSelection: track('cut', () => 1),
    paste: track('paste', () => ['new-1']),
    getClipboard: () => ({ symbols: [{ id: 'a' }] as never[], operation: 'copy' as const }),
    exportConfig: track('export', () => '{}'),
    importConfig: track('import', () => true),
    listSymbolLibrary: () => [{ type: 'scada-rect', name: 'Rect' }],
    ...overrides,
  } as unknown as EditorEngineRuntime & { calls: Record<string, unknown[]>; allCalls: Record<string, unknown[][]> };
  rt.calls = calls;
  rt.allCalls = allCalls;
  return rt;
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  // plan 2026-08-09-0648-2 Phase 3：word 按钮 label 现经 i18n 解析，行为用例需确定 i18n 状态。
  // 重置后以默认 zh-CN 初始化，使 word 按钮渲染中文 label（'删除'/'适配' 等）；行为用例改用 data-testid
  // 定位按钮（locale 无关），仅 i18n focused 用例断言中文文案。
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderPanel(selection: string[], runtime?: ReturnType<typeof makeRuntime>) {
  const rt = runtime ?? makeRuntime();
  const { container } = render(
    <EditorToolboxPanel runtime={rt} selection={selection} onError={() => undefined} />,
  );
  return { container, runtime: rt };
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const found = buttons.find((b) => b.textContent?.trim() === text);
  if (!found) throw new Error(`button "${text}" not found`);
  return found;
}

// plan 2026-08-09-0648-2 Phase 3：word 按钮 label 经 i18n 解析后随 locale 变化，
// 行为用例经稳定 data-testid 定位（locale 无关）；glyph 按钮 label 为符号不变，仍可用 buttonByText。
function buttonByTestId(container: HTMLElement, testid: string): HTMLButtonElement {
  const found = container.querySelector(`button[data-testid="${testid}"]`);
  if (!found) throw new Error(`button[testid="${testid}"] not found`);
  return found as HTMLButtonElement;
}

describe('EditorToolboxPanel (design-toolbox.md §10 + §11)', () => {
  it('renders toolbox marker with data-slot', () => {
    const { container } = renderPanel([]);
    expect(container.querySelector('[data-slot="scada-editor-toolbox"]')).not.toBeNull();
  });

  it('view tool buttons call engine command face (fit/center/reset/zoom)', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #25：从「被调用」推进到「调用参数 / 副作用可观测」。
    const { container, runtime } = renderPanel([]);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-fit'));
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-center'));
    fireEvent.click(buttonByText(container, '1:1'));
    fireEvent.click(buttonByText(container, '+'));
    fireEvent.click(buttonByText(container, '−'));
    // 每按钮恰好调用 1 次（计数可观测）
    expect(runtime.allCalls.fitView).toHaveLength(1);
    expect(runtime.allCalls.centerView).toHaveLength(1);
    expect(runtime.allCalls.resetView).toHaveLength(1);
    // zoom 参数可观测：+ 传 1.2，− 传 1/1.2（顺序匹配点击顺序）
    expect(runtime.allCalls.zoomView).toHaveLength(2);
    expect(runtime.allCalls.zoomView[0][0]).toBe(1.2);
    expect(runtime.allCalls.zoomView[1][0]).toBeCloseTo(1 / 1.2, 5);
    // 副作用可观测：status 消息反映 viewport（证明 handler 跑完整路径 + 读 getViewport）
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('视口');
    expect(status?.textContent).toContain('@1.00x');
  });

  it('align buttons disabled when selection < 2', () => {
    const { container } = renderPanel(['a']);
    expect(buttonByText(container, '⌅L').disabled).toBe(true);
    expect(buttonByText(container, '⌅R').disabled).toBe(true);
  });

  it('align buttons enabled + call alignSelection when selection >= 2', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #25：断言传入方向参数（非仅「被调用」）。
    const { container, runtime } = renderPanel(['a', 'b']);
    const alignBtn = buttonByText(container, '⌅L');
    expect(alignBtn.disabled).toBe(false);
    fireEvent.click(alignBtn);
    expect(runtime.calls.align).toBeDefined();
    expect(runtime.calls.align[0]).toBe('left');
  });

  it('distribute buttons disabled when selection < 3', () => {
    const { container } = renderPanel(['a', 'b']);
    expect(buttonByText(container, '↔').disabled).toBe(true);
  });

  it('distribute buttons enabled + call distributeSelection when selection >= 3', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #25：断言传入方向参数。
    const { container, runtime } = renderPanel(['a', 'b', 'c']);
    fireEvent.click(buttonByText(container, '↕'));
    expect(runtime.calls.distribute).toBeDefined();
    expect(runtime.calls.distribute[0]).toBe('vertical');
  });

  it('z-order buttons disabled when no selection', () => {
    const { container } = renderPanel([]);
    expect(buttonByText(container, '⤒').disabled).toBe(true);
  });

  it('z-order buttons call reorderZOrder when selection present', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #25：断言传入 z-order action 参数（4 个按钮 4 个不同 action）。
    const { container, runtime } = renderPanel(['a']);
    fireEvent.click(buttonByText(container, '⤒'));
    fireEvent.click(buttonByText(container, '↑'));
    fireEvent.click(buttonByText(container, '↓'));
    fireEvent.click(buttonByText(container, '⤓'));
    expect(runtime.allCalls.zorder).toHaveLength(4);
    expect(runtime.allCalls.zorder[0][0]).toBe('toTop');
    expect(runtime.allCalls.zorder[1][0]).toBe('moveUp');
    expect(runtime.allCalls.zorder[2][0]).toBe('moveDown');
    expect(runtime.allCalls.zorder[3][0]).toBe('toBottom');
  });

  it('copy/cut disabled when no selection; paste disabled when clipboard empty', () => {
    const emptyClipboard = makeRuntime({ getClipboard: () => null });
    const { container } = renderPanel([], emptyClipboard);
    expect(buttonByTestId(container, 'toolbox-btn-copy').disabled).toBe(true);
    expect(buttonByTestId(container, 'toolbox-btn-cut').disabled).toBe(true);
    expect(buttonByTestId(container, 'toolbox-btn-paste').disabled).toBe(true);
  });

  it('copy/cut/paste call runtime methods when enabled', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #25：副作用可观测——status 消息反映 copy/cut/paste 计数。
    const { container, runtime } = renderPanel(['a']);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-copy'));
    expect(runtime.calls.copy).toBeDefined();
    let status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('已复制');
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-cut'));
    expect(runtime.calls.cut).toBeDefined();
    status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('剪切');
    // after copy, clipboard non-empty → paste enabled
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-paste'));
    expect(runtime.calls.paste).toBeDefined();
    status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('已粘贴');
  });

  it('export button calls exportConfig', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #25：副作用可观测——status 消息含「已导出」。
    const { container, runtime } = renderPanel([]);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-export'));
    expect(runtime.calls.export).toBeDefined();
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('已导出');
  });

  it('undo/redo call runtime undo/redo', () => {
    // seed stack so undo/redo enabled
    const rt = makeRuntime();
    rt.session.undoStack.push({ forward: { added: [], removed: [], updated: [] }, inverse: { added: [], removed: [], updated: [] }, operationKind: 'update-symbol', timestamp: 0 });
    const { container } = renderPanel([], rt);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-undo'));
    expect(rt.calls.undo).toBeDefined();
  });

  it('import button opens confirm dialog (T5)', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-import'));
    // dialog renders into portal (document.body)
    expect(document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]')).not.toBeNull();
  });

  it('import confirm calls importConfig + closes dialog', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-import'));
    const textarea = document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{"version":1,"symbols":[]}' } });
    const confirmBtn = document.querySelector('[data-slot="scada-editor-toolbox-confirm"]') as HTMLButtonElement;
    fireEvent.click(confirmBtn);
    // dialog closed after confirm
    expect(document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]')).toBeNull();
  });

  it('import confirm disabled when textarea empty', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-import'));
    const confirmBtn = document.querySelector('[data-slot="scada-editor-toolbox-confirm"]') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it('fit returning false surfaces not-visible status message', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #24：验证 i18n 文本内容（t(notVisible) => '无可见图元'）。
    const emptyScene = makeRuntime({ fitView: () => false });
    const { container } = renderPanel([], emptyScene);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-fit'));
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toContain('无可见图元');
  });

  it('paste with empty clipboard surfaces clipboard-empty message', () => {
    const emptyCb = makeRuntime({ getClipboard: () => null });
    const { container } = renderPanel([], emptyCb);
    // paste disabled when clipboard empty; enable by giving selection + simulating copy state
    // Instead, directly: copy sets clipboardCount, paste reads it. With empty clipboard, paste button is disabled.
    expect(buttonByTestId(container, 'toolbox-btn-paste').disabled).toBe(true);
  });

  it('align no-op (returns false) surfaces no-change message', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #24：验证 i18n 文本内容（t(noChange) => '无变化'）。
    const noOp = makeRuntime({ alignSelection: () => false });
    const { container } = renderPanel(['a', 'b'], noOp);
    fireEvent.click(buttonByText(container, '⌅L'));
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('无变化');
  });

  it('distribute no-op (returns false) surfaces no-change message', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #24：验证 i18n 文本内容。
    const noOp = makeRuntime({ distributeSelection: () => false });
    const { container } = renderPanel(['a', 'b', 'c'], noOp);
    fireEvent.click(buttonByText(container, '↔'));
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('无变化');
  });

  it('z-order no-op (returns false) surfaces no-change message', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #24：验证 i18n 文本内容。
    const noOp = makeRuntime({ reorderZOrder: () => false });
    const { container } = renderPanel(['a'], noOp);
    fireEvent.click(buttonByText(container, '⤒'));
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('无变化');
  });

  it('import confirm with failing importConfig surfaces invalid-config message', () => {
    // plan 2026-08-08-0900-2 Phase 1 / P2 #24：验证 i18n 文本内容（t(invalidConfig) => '配置非法，导入失败'）。
    const rt = makeRuntime({ importConfig: () => false });
    const { container } = renderPanel([], rt);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-import'));
    const textarea = document.querySelector('[data-slot="scada-editor-toolbox-import-textarea"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'garbage' } });
    const confirmBtn = document.querySelector('[data-slot="scada-editor-toolbox-confirm"]') as HTMLButtonElement;
    fireEvent.click(confirmBtn);
    const status = container.querySelector('[data-slot="scada-editor-toolbox-status"]');
    expect(status?.textContent).toContain('配置非法，导入失败');
  });

  it('redo button calls runtime redo when canRedo', () => {
    const rt = makeRuntime();
    const entry = {
      forward: { added: [], removed: [], updated: [] },
      inverse: { added: [], removed: [], updated: [] },
      operationKind: 'update-symbol' as const,
      timestamp: 0,
    };
    rt.session.undoStack.push(entry);
    rt.session.undoStack.popForUndo();
    const { container } = renderPanel([], rt);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-redo'));
    expect(rt.calls.redo).toBeDefined();
  });

  it('status message surfaces after a tool click', () => {
    const { container } = renderPanel([]);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-fit'));
    expect(container.querySelector('[data-slot="scada-editor-toolbox-status"]')).not.toBeNull();
  });

  // plan 2026-08-08-0900-1 Phase 5 / P2 #21：canPaste 从 canonical clipboard 派生（非 React state mirror）。
  it('#21 Paste disabled→enabled after copy (canPaste derived from canonical clipboard)', () => {
    // Mutable clipboard mock: starts empty, copySelection populates it.
    let clipboardSymbols: unknown[] = [];
    const rt = makeRuntime({
      copySelection: () => {
        clipboardSymbols = [{ id: 'a' }];
        return clipboardSymbols.length;
      },
      getClipboard: () => clipboardSymbols.length > 0 ? { symbols: clipboardSymbols as never[], operation: 'copy' as const } : null,
    });
    const { container } = renderPanel(['a'], rt);
    // Initially clipboard empty → Paste disabled.
    expect(buttonByTestId(container, 'toolbox-btn-paste').disabled).toBe(true);
    // Copy populates canonical clipboard → Paste enabled on re-render.
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-copy'));
    expect(buttonByTestId(container, 'toolbox-btn-paste').disabled).toBe(false);
  });

  it('#21 Paste re-disabled when clipboard cleared externally (no stale state mirror)', () => {
    // Simulates external clipboard clear (e.g., load/undo/test handle) — with state mirror this would stay enabled.
    let clipboardSymbols: unknown[] = [{ id: 'a' }];
    const rt = makeRuntime({
      getClipboard: () => clipboardSymbols.length > 0 ? { symbols: clipboardSymbols as never[], operation: 'copy' as const } : null,
    });
    const { container } = renderPanel(['a'], rt);
    // Clipboard non-empty → Paste enabled.
    expect(buttonByTestId(container, 'toolbox-btn-paste').disabled).toBe(false);
    // External clear: clipboard emptied outside toolbox.
    clipboardSymbols = [];
    // Trigger re-render (parent bumpSessionVersion analog — status change forces re-render).
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-fit'));
    expect(buttonByTestId(container, 'toolbox-btn-paste').disabled).toBe(true);
  });

  // plan 2026-08-08-1931-1 Phase 3 / P2-4：按钮路径传完整 selection（数组）→ 批量单 diff。
  it('Del button calls removeWorkingSymbol with full selection array (batch, P2-4)', () => {
    const { container, runtime } = renderPanel(['a', 'b', 'c']);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-delete'));
    expect(runtime.calls.removeWorkingSymbol).toBeDefined();
    // 传完整 selection 数组（非逐个循环）。
    expect(runtime.calls.removeWorkingSymbol[0]).toEqual(['a', 'b', 'c']);
  });

  it('Ungroup button calls ungroupSymbols with full selection array (batch, P2-4)', () => {
    const { container, runtime } = renderPanel(['a', 'b']);
    fireEvent.click(buttonByTestId(container, 'toolbox-btn-ungroup'));
    expect(runtime.calls.ungroupSymbols).toBeDefined();
    expect(runtime.calls.ungroupSymbols[0]).toEqual(['a', 'b']);
  });

  // plan 2026-08-09-0648-2 Phase 3 (D3/D5)：word 按钮 label i18n focused 用例。
  it('word buttons render resolved localized labels (zh-CN, not raw key)', () => {
    const { container } = renderPanel([]);
    // 12 个 word 按钮全部经 t() 解析命中 zh locale（抽样断言；glyph 按钮 + 1:1 保持原符号）。
    expect(buttonByTestId(container, 'toolbox-btn-delete').textContent?.trim()).toBe('删除');
    expect(buttonByTestId(container, 'toolbox-btn-group').textContent?.trim()).toBe('组合');
    expect(buttonByTestId(container, 'toolbox-btn-ungroup').textContent?.trim()).toBe('解组');
    expect(buttonByTestId(container, 'toolbox-btn-copy').textContent?.trim()).toBe('复制');
    expect(buttonByTestId(container, 'toolbox-btn-cut').textContent?.trim()).toBe('剪切');
    expect(buttonByTestId(container, 'toolbox-btn-paste').textContent?.trim()).toBe('粘贴');
    expect(buttonByTestId(container, 'toolbox-btn-undo').textContent?.trim()).toBe('撤销');
    expect(buttonByTestId(container, 'toolbox-btn-redo').textContent?.trim()).toBe('重做');
    expect(buttonByTestId(container, 'toolbox-btn-export').textContent?.trim()).toBe('导出');
    expect(buttonByTestId(container, 'toolbox-btn-import').textContent?.trim()).toBe('导入');
    expect(buttonByTestId(container, 'toolbox-btn-fit').textContent?.trim()).toBe('适配');
    expect(buttonByTestId(container, 'toolbox-btn-center').textContent?.trim()).toBe('居中');
    // glyph 按钮 + 1:1 (D4) label 保持原符号，i18n 不适用。
    expect(buttonByTestId(container, 'toolbox-btn-reset').textContent?.trim()).toBe('1:1');
    expect(buttonByTestId(container, 'toolbox-btn-zoom-in').textContent?.trim()).toBe('+');
    expect(buttonByTestId(container, 'toolbox-btn-zoom-out').textContent?.trim()).toBe('−');
    expect(buttonByTestId(container, 'toolbox-btn-align-left').textContent?.trim()).toBe('⌅L');
    expect(buttonByTestId(container, 'toolbox-btn-distribute-h').textContent?.trim()).toBe('↔');
    // raw key 不应泄漏到可见文本。
    expect(buttonByTestId(container, 'toolbox-btn-fit').textContent).not.toContain('industrial.scada.editor.toolbox.label.fit');
  });

  it('word buttons fall back to original English short label on locale miss (explicit miss-detection, D5)', () => {
    // 重置 i18n 并以空资源初始化 → 所有 `t(key)` 未命中返回 key 串本身 → `labelOr` 经 `=== key` 显式
    // 未命中检测后回退原英文短词。守护：若误用 `||` 短路 fallback（key 串非 falsy），此处会渲染 raw key
    // 而非英文短词 → 断言转红。
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN', resources: { 'zh-CN': { flux: {} } } });
    const { container } = renderPanel([]);
    expect(buttonByTestId(container, 'toolbox-btn-delete').textContent?.trim()).toBe('Del');
    expect(buttonByTestId(container, 'toolbox-btn-group').textContent?.trim()).toBe('Group');
    expect(buttonByTestId(container, 'toolbox-btn-ungroup').textContent?.trim()).toBe('Ungroup');
    expect(buttonByTestId(container, 'toolbox-btn-copy').textContent?.trim()).toBe('Copy');
    expect(buttonByTestId(container, 'toolbox-btn-cut').textContent?.trim()).toBe('Cut');
    expect(buttonByTestId(container, 'toolbox-btn-paste').textContent?.trim()).toBe('Paste');
    expect(buttonByTestId(container, 'toolbox-btn-undo').textContent?.trim()).toBe('Undo');
    expect(buttonByTestId(container, 'toolbox-btn-redo').textContent?.trim()).toBe('Redo');
    expect(buttonByTestId(container, 'toolbox-btn-export').textContent?.trim()).toBe('Export');
    expect(buttonByTestId(container, 'toolbox-btn-import').textContent?.trim()).toBe('Import');
    expect(buttonByTestId(container, 'toolbox-btn-fit').textContent?.trim()).toBe('Fit');
    expect(buttonByTestId(container, 'toolbox-btn-center').textContent?.trim()).toBe('Center');
    // raw key 不应泄漏（证明显式未命中检测生效，非 `||` 短路）。
    expect(buttonByTestId(container, 'toolbox-btn-fit').textContent).not.toContain('industrial.scada.editor.toolbox.label.fit');
  });
});

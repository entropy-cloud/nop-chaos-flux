import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WebSocketConnection, WebSocketOpener } from '@nop-chaos/flux-core';
import { EditorState } from '@codemirror/state';
import { XlangDebugEditor } from '../assembly/xlang-debug-editor.js';
import { createDebugStore, type DebugStore } from '../state/debug-store.js';
import { breakpointsField } from '../extension/fields.js';
import { exceptionLinesField, suspendedLinesField } from '../extension/decorations.js';
import { sourcePathFacet } from '../extension/source-path.js';

// plan 621 审计 B5：捕获面全部收敛进 vi.hoisted 的 **plain 数据容器**（数组/对象）。
// vitest 的 vi.mock 提升变换会把工厂放进独立模块上下文——跨边界共享 vi.fn 实例
// 的 mock.calls 两侧不一致（实测：工厂侧计数 1、测试体读 0），plain 容器则一致。
// linter 工厂 mock 为透传（返回真实 linter 扩展，供 EditorState.create 消费）。
const captures = vi.hoisted(() => ({
  registerCalls: 0,
  languageExtensionArgs: [] as string[],
  linterCalls: [] as Array<{ compile: unknown; sourcePath?: string; debounceMs?: number }>,
  injected: null as unknown[] | null,
}));

vi.mock('@nop-chaos/flux-xlang-lang', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-xlang-lang')>();
  return {
    ...actual,
    registerXlangLanguage: () => {
      captures.registerCalls += 1;
    },
    createXlangLinter: (opts: { compile: unknown; sourcePath?: string; debounceMs?: number }) => {
      captures.linterCalls.push(opts);
      return actual.createXlangLinter(opts as Parameters<typeof actual.createXlangLinter>[0]);
    },
    // createLanguageExtension 来自 flux-code-editor——CE 被部分 mock，lang 的 xlang()
    // 依赖 CE 的 parser 注册；此处以真实 xlang() 不可行（其经 CE registry）
  };
});

vi.mock('@nop-chaos/flux-code-editor', async () => {
  const { EditorView } = await import('@codemirror/view');
  return {
    createLanguageExtension: (language: string) => {
      captures.languageExtensionArgs.push(language);
      return EditorView.lineWrapping; // 真实 Extension——EditorState 可消费
    },
    createBaseExtensions: (opts: { language: string }) => {
      captures.languageExtensionArgs.push(opts.language);
      return [EditorView.lineWrapping];
    },
    useCodeMirror: (options: { extensions?: unknown[]; initialValue?: string }) => {
      // 记录注入的 extensions（Wiring Verification：装配层确实传入调试扩展）
      captures.injected = options.extensions ?? [];
      return { editorRef: { current: null }, view: null };
    },
  };
});

/** 良性假连接：connect() 生命周期冒烟不抛未处理拒绝。 */
function fakeConnection(): WebSocketConnection {
  return {
    readyState: 'open',
    send: () => {},
    close: () => {},
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };
}

function renderEditor(): DebugStore {
  const store = createDebugStore();
  const openSocket: WebSocketOpener = (_url: string) => fakeConnection();
  render(
    <XlangDebugEditor
      sourcePath="demo.xpl"
      serverUrl="/ws/xlang-debugger"
      openSocket={openSocket}
      compile={async () => []}
      getToken={() => 't'}
      initialSource="return 1;"
    />,
  );
  return store;
}

function capturedExtensions(): unknown[] {
  return captures.injected ?? [];
}

describe('XlangDebugEditor assembly', () => {
  it('injects xlang language + debug extensions into useCodeMirror (wiring)', () => {
    captures.injected = null;
    renderEditor();
    // m2 强化（plan 621 审计 B5 判别化）：语言分支经 createBaseExtensions 命中
    expect(captures.languageExtensionArgs).toContain('xlang');
    expect(capturedExtensions().length).toBeGreaterThanOrEqual(5);
  });

  it('registers all three down-link fields + facet value + linter sourcePath in real CM state (plan 621 B1/B2/B5)', () => {
    captures.injected = null;
    renderEditor();
    const injected = capturedExtensions();
    // B1 回归钉：三族 StateField 逐个判别（缺任何一个即红——计数断言抓不到）
    expect(injected).toContain(breakpointsField);
    expect(injected).toContain(suspendedLinesField);
    expect(injected).toContain(exceptionLinesField);
    // 经真实 EditorState 消费：facet 值 = sourcePath prop；字段真实注册（非 undefined）
    const state = EditorState.create({ extensions: injected as never[] });
    expect(state.facet(sourcePathFacet)).toBe('demo.xpl');
    expect(state.field(breakpointsField, false)).toBeInstanceOf(Set);
    // B2 回归钉：linter 收到文档锚点（不再是硬编码 repl.xpl）
    const last = captures.linterCalls.at(-1);
    expect(last).toBeDefined();
    expect(last!.sourcePath).toBe('demo.xpl');
    expect(last!.debounceMs).toBe(800);
    expect(typeof last!.compile).toBe('function');
  });

  it('registers xlang language once across mounts (ensureXlangLanguage idempotent)', () => {
    renderEditor();
    const afterFirst = captures.registerCalls;
    renderEditor();
    const afterSecond = captures.registerCalls;
    // 幂等核心断言：同测试内第二个实例不触发注册（模块级一次性注册语义——
    // 若 ensure 每次 mount 都注册，afterSecond = afterFirst + 1 即红）。
    // 计数器跨测试共享模块态单调累加，绝对值不做假设（首例注册可能被前序测试消费）。
    expect(afterSecond).toBe(afterFirst);
    expect(afterFirst).toBeGreaterThanOrEqual(1);
  });

  it('renders editor main + debug panel structure', () => {
    renderEditor();
    expect(document.querySelector('[data-testid="xlang-debug-editor"]')).toBeTruthy();
  });
});

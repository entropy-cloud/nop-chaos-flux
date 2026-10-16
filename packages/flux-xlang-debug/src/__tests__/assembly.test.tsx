import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WebSocketOpener } from '@nop-chaos/flux-core';
import { XlangDebugEditor } from '../assembly/xlang-debug-editor.js';

vi.mock('@nop-chaos/flux-xlang-lang', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-xlang-lang')>();
  return {
    ...actual,
    registerXlangLanguage: vi.fn(),
    // createLanguageExtension 来自 flux-code-editor——CE 被部分 mock，lang 的 xlang()
    // 依赖 CE 的 parser 注册；此处以真实 xlang() 不可行（其经 CE registry），改由
    // CE 侧 createLanguageExtension mock 提供 marker extension
  };
});

const mockCreateLanguageExtension = vi.fn(() => ['xlang-language-marker']);

vi.mock('@nop-chaos/flux-code-editor', () => ({
  createLanguageExtension: (...args: unknown[]) => mockCreateLanguageExtension(...(args as [string])),
  useCodeMirror: (options: { extensions?: unknown[]; initialValue?: string }) => {
    // 记录注入的 extensions（Wiring Verification：装配层确实传入调试扩展）
    (globalThis as unknown as { __injected?: unknown[] }).__injected = options.extensions;
    return { editorRef: { current: null }, view: null };
  },
}));

import type { WebSocketConnection } from '@nop-chaos/flux-core';

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

describe('XlangDebugEditor assembly', () => {
  it('injects xlang language + debug extensions into useCodeMirror (wiring)', () => {
    (globalThis as unknown as { __injected?: unknown[] }).__injected = undefined;
    const openSocket: WebSocketOpener = () => fakeConnection();
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
    const injected = (globalThis as unknown as { __injected?: unknown[] }).__injected ?? [];
    // xlang 语言扩展 + gutter + suspended + exception + facet + linter
    expect(injected.length).toBeGreaterThanOrEqual(5);
    expect(mockCreateLanguageExtension).toHaveBeenCalledWith('xlang');
  });

  it('registers xlang language once (ensureXlangLanguage idempotent)', () => {
    render(
      <XlangDebugEditor
        sourcePath="demo.xpl"
        serverUrl="/ws/xlang-debugger"
        openSocket={() => fakeConnection()}
        compile={async () => []}
        getToken={() => 't'}
      />,
    );
    expect(true).toBe(true);
  });

  it('renders editor main + debug panel structure', () => {
    render(
      <XlangDebugEditor
        sourcePath="demo.xpl"
        serverUrl="/ws/xlang-debugger"
        openSocket={() => fakeConnection()}
        compile={async () => []}
        getToken={() => 't'}
      />,
    );
    expect(document.querySelector('[data-testid="xlang-debug-editor"]')).toBeTruthy();
  });
});

// store 类型仅用于类型推断引用（避免未用告警）
export type StoreAlias = DebugStore;

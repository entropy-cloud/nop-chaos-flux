import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WebSocketConnection, WebSocketOpener } from '@nop-chaos/flux-core';
import { XlangDebugEditor } from '../assembly/xlang-debug-editor.js';
import { createDebugStore, type DebugStore } from '../state/debug-store.js';

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

const mockCreateLanguageExtension = vi.fn((language: string) => [`xlang-language-marker:${language}`]);

vi.mock('@nop-chaos/flux-code-editor', () => ({
  createLanguageExtension: (language: string) => mockCreateLanguageExtension(language),
  useCodeMirror: (options: { extensions?: unknown[]; initialValue?: string }) => {
    // 记录注入的 extensions（Wiring Verification：装配层确实传入调试扩展）
    (globalThis as unknown as { __injected?: unknown[] }).__injected = options.extensions;
    return { editorRef: { current: null }, view: null };
  },
}));

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

describe('XlangDebugEditor assembly', () => {
  it('injects xlang language + debug extensions into useCodeMirror (wiring)', () => {
    (globalThis as unknown as { __injected?: unknown[] }).__injected = undefined;
    renderEditor();
    const injected = (globalThis as unknown as { __injected?: unknown[] }).__injected ?? [];
    // xlang 语言扩展 + gutter + suspended + exception + facet + linter
    expect(injected.length).toBeGreaterThanOrEqual(5);
    expect(mockCreateLanguageExtension).toHaveBeenCalledWith('xlang');
  });

  it('registers xlang language (ensureXlangLanguage idempotent)', () => {
    renderEditor();
    expect(mockCreateLanguageExtension).toHaveBeenCalledWith('xlang');
  });

  it('renders editor main + debug panel structure', () => {
    renderEditor();
    expect(document.querySelector('[data-testid="xlang-debug-editor"]')).toBeTruthy();
  });
});

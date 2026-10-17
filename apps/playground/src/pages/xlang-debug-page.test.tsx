// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import type { WebSocketConnection } from '@nop-chaos/flux-core';

afterEach(() => cleanup());

// plan 621 Phase 2 演示页冒烟：happy-dom 零布局下真实 CodeMirror 行号几何不可控
// （plan 617 结论），与 assembly.test 同一边界——mock CE 传输面，页面到装配组件的
// schema→registry→SchemaRenderer→renderer definition→XlangDebugEditor 链保持真实。
const mockCreateLanguageExtension = vi.fn((language: string) => [`xlang-language-marker:${language}`]);

vi.mock('@nop-chaos/flux-code-editor', () => ({
  createLanguageExtension: (language: string) => mockCreateLanguageExtension(language),
  registerLanguage: vi.fn(),
  createBaseExtensions: (opts: { language: string }) => {
    mockCreateLanguageExtension(opts.language);
    return [`xlang-base-marker:${opts.language}`];
  },
  useCodeMirror: (options: { extensions?: unknown[] }) => {
    (globalThis as unknown as { __xlangPageInjected?: unknown[] }).__xlangPageInjected = options.extensions;
    return { editorRef: { current: null }, view: null };
  },
}));

vi.mock('@nop-chaos/flux-xlang-lang', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-xlang-lang')>();
  return {
    ...actual,
    // xlang() 依赖 CE registry（本文件已 mock CE），语言注册以 marker 断言代替
    registerXlangLanguage: vi.fn(),
  };
});

/** 良性假连接：演示页 openSocket 链不触发真实 WebSocket（冒烟确定性）。 */
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

vi.mock('../env/socket-impl', () => ({
  createDefaultOpenSocket: () => () => fakeConnection(),
}));

import XlangDebugPage from './xlang-debug-page';
import { breakpointsField, suspendedLinesField, exceptionLinesField } from '@nop-chaos/flux-xlang-debug';

beforeAll(() => {
  initFluxI18n();
});

describe('XlangDebugPage smoke (plan 621 Phase 2)', () => {
  it('renders token gate before connect (button disabled without token)', () => {
    render(<XlangDebugPage />);
    expect(screen.getByText('XLang 在线调试（演示）')).toBeTruthy();
    const button = screen.getByRole('button', { name: '连接调试会话' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('renders editor surface via schema+registry+SchemaRenderer path after connect (wiring)', () => {
    (globalThis as unknown as { __xlangPageInjected?: unknown[] }).__xlangPageInjected = undefined;
    render(<XlangDebugPage />);
    fireEvent.change(screen.getByPlaceholderText('access token'), { target: { value: 'demo-token' } });
    fireEvent.click(screen.getByRole('button', { name: '连接调试会话' }));
    // M4：schema type 'xlang-debug-editor' 经 renderer definition 命中装配组件
    expect(document.querySelector('[data-testid="xlang-debug-editor"]')).toBeTruthy();
    // plan 621 审计 B5（判别化）：三族下行 StateField 逐个在注入集（计数断言抓不出缺员）
    const injected = (globalThis as unknown as { __xlangPageInjected?: unknown[] }).__xlangPageInjected ?? [];
    expect(injected).toContain(breakpointsField);
    expect(injected).toContain(suspendedLinesField);
    expect(injected).toContain(exceptionLinesField);
    expect(mockCreateLanguageExtension).toHaveBeenCalledWith('xlang');
  });
});

import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WebSocketConnection, WebSocketOpener } from '@nop-chaos/flux-core';
import { XlangDebugEditor } from '../assembly/xlang-debug-editor.js';

// P1-MA4.4-010 INV regression guard: renderer-env.md capability check —
// `if (env.openSocket) { ... } else { fallback or error }` must gate the
// connection. The assembly (:135-143) renders the connect-error text and
// never touches openSocket when the capability is absent. Zero tests
// referenced createCompileService or this negative path before (audit
// Round H / H-01 + Round J / J-05).
//
// Harness: same mocking idiom as assembly.test.tsx (useCodeMirror mocked —
// the guard path returns before any editor wiring matters).

vi.mock('@nop-chaos/flux-code-editor', async () => {
  const { EditorView } = await import('@codemirror/view');
  return {
    createLanguageExtension: () => EditorView.lineWrapping,
    createBaseExtensions: () => [EditorView.lineWrapping],
    useCodeMirror: () => ({ editorRef: { current: null }, view: null }),
    // flux-xlang-lang/register.ts (transitively imported) binds these at module init
    registerLanguage: () => undefined,
    createLanguageExtensionXlang: () => EditorView.lineWrapping,
  };
});

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

const compile = async () => [];

describe('xlang-debug openSocket capability negative path (P1-MA4.4-010)', () => {
  it('absent capability renders the connect-error text and never opens a socket', async () => {
    // absent = undefined (a vi.fn stub is truthy and counts as "present")
    const openSocket = undefined as unknown as WebSocketOpener;
    const onSessionClosed = vi.fn();

    const { container } = render(
      <XlangDebugEditor
        sourcePath="demo.xpl"
        serverUrl="/ws/xlang-debugger"
        openSocket={openSocket}
        compile={compile}
        getToken={() => undefined}
        initialSource="return 1;"
        onSessionClosed={onSessionClosed}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain('env.openSocket 不可用');
    });
    // guard held: no session lifecycle fired on the absent capability
    expect(onSessionClosed).not.toHaveBeenCalled();
  });

  it('control: a present capability opens a connection and the error text stays absent', async () => {
    const openSocket = vi.fn((_url: string) => fakeConnection()) as unknown as WebSocketOpener;
    const onSessionClosed = vi.fn();

    const { container } = render(
      <XlangDebugEditor
        sourcePath="demo.xpl"
        serverUrl="/ws/xlang-debugger"
        openSocket={openSocket}
        compile={compile}
        getToken={() => 't'}
        initialSource="return 1;"
        onSessionClosed={onSessionClosed}
      />,
    );

    await waitFor(() => {
      expect((openSocket as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    expect(container.textContent).not.toContain('env.openSocket 不可用');
  });
});

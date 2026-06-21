// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { EditorView } from '@codemirror/view';
import { useCodeEditorHandle } from '../code-editor-renderer/use-code-editor-handle.js';
import type { CodeEditorRendererProps } from '../code-editor-renderer/shared.js';

interface CapturedHandle {
  capabilities: {
    invoke(method: string, payload?: unknown, ctx?: unknown): unknown;
    hasMethod(method: string): boolean;
    listMethods(): readonly string[];
  };
}

const mockState: {
  currentRegistry: {
    register: ReturnType<typeof vi.fn>;
  } | undefined;
} = {
  currentRegistry: undefined,
};

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => mockState.currentRegistry,
  };
});

interface ProbeProps {
  view: EditorView | null;
  initialValue: string;
  rendererProps: CodeEditorRendererProps;
}

function HandleProbe(props: ProbeProps) {
  const initialValueRef = React.useRef(props.initialValue);
  React.useEffect(() => {
    initialValueRef.current = props.initialValue;
  }, [props.initialValue]);
  useCodeEditorHandle(props.rendererProps, {
    view: props.view,
    initialValueRef,
  });
  return null;
}

function makeEditorViewMock(docText: string) {
  let currentDoc = docText;
  const mockView = {
    state: {
      doc: {
        toString() {
          return currentDoc;
        },
        get length() {
          return currentDoc.length;
        },
      },
    },
    focus: vi.fn(),
    dispatch: vi.fn((tr: { changes?: { insert?: string } }) => {
      if (tr.changes?.insert !== undefined) {
        currentDoc = tr.changes.insert;
      }
    }),
  } as unknown as EditorView;
  return mockView;
}

function makeRendererProps(overrides?: Partial<CodeEditorRendererProps>): CodeEditorRendererProps {
  return {
    id: 'code-editor-1',
    meta: { cid: 7, className: '' },
    props: { language: 'javascript', name: 'script' },
    events: {},
    regions: {},
    helpers: {} as never,
    node: undefined,
    ...overrides,
  } as CodeEditorRendererProps;
}

describe('useCodeEditorHandle (E2h handles)', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
  });

  afterEach(() => {
    cleanup();
    mockState.currentRegistry = undefined;
  });

  it('registers the handle and exposes clear/reset/focus/getEditorView methods', () => {
    const dispose = vi.fn();
    const register = vi.fn(() => dispose);
    mockState.currentRegistry = { register };

    const view = makeEditorViewMock('initial content');
    const rendererProps = makeRendererProps();

    render(
      <HandleProbe view={view} initialValue={'initial content'} rendererProps={rendererProps} />,
    );

    expect(register).toHaveBeenCalledWith(expect.any(Object), { cid: 7 });
    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as CapturedHandle;
    expect(handle).toBeTruthy();
    expect(handle.capabilities.listMethods()).toEqual([
      'clear',
      'reset',
      'focus',
      'getEditorView',
    ]);
    expect(handle.capabilities.hasMethod('clear')).toBe(true);
    expect(handle.capabilities.hasMethod('reset')).toBe(true);
    expect(handle.capabilities.hasMethod('focus')).toBe(true);
    expect(handle.capabilities.hasMethod('getEditorView')).toBe(true);
    expect(handle.capabilities.hasMethod('unknown')).toBe(false);
  });

  it('clear empties the editor content', () => {
    const register = vi.fn(() => vi.fn());
    mockState.currentRegistry = { register };

    const view = makeEditorViewMock('hello world');
    render(
      <HandleProbe
        view={view}
        initialValue={'hello world'}
        rendererProps={makeRendererProps()}
      />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as CapturedHandle;
    const result = handle.capabilities.invoke('clear');
    expect(result).toEqual({ ok: true });
    expect(view.dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 'hello world'.length, insert: '' },
    });
    expect(view.state.doc.toString()).toBe('');
  });

  it('reset restores the initial value', () => {
    const register = vi.fn(() => vi.fn());
    mockState.currentRegistry = { register };

    const view = makeEditorViewMock('changed text');
    render(
      <HandleProbe
        view={view}
        initialValue={'original text'}
        rendererProps={makeRendererProps()}
      />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as CapturedHandle;
    const result = handle.capabilities.invoke('reset');
    expect(result).toEqual({ ok: true });
    expect(view.dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 'changed text'.length, insert: 'original text' },
    });
    expect(view.state.doc.toString()).toBe('original text');
  });

  it('focus calls editorView.focus()', () => {
    const register = vi.fn(() => vi.fn());
    mockState.currentRegistry = { register };

    const view = makeEditorViewMock('content');
    render(
      <HandleProbe view={view} initialValue={'content'} rendererProps={makeRendererProps()} />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as CapturedHandle;
    const result = handle.capabilities.invoke('focus');
    expect(result).toEqual({ ok: true });
    expect(view.focus).toHaveBeenCalled();
  });

  it('getEditorView returns the raw EditorView instance', () => {
    const register = vi.fn(() => vi.fn());
    mockState.currentRegistry = { register };

    const view = makeEditorViewMock('content');
    render(
      <HandleProbe view={view} initialValue={'content'} rendererProps={makeRendererProps()} />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as CapturedHandle;
    const result = handle.capabilities.invoke('getEditorView') as {
      ok: boolean;
      data?: EditorView;
    };
    expect(result.ok).toBe(true);
    expect(result.data).toBe(view);
  });

  it('returns ok:false for unsupported methods', () => {
    const register = vi.fn(() => vi.fn());
    mockState.currentRegistry = { register };

    const view = makeEditorViewMock('content');
    render(
      <HandleProbe view={view} initialValue={'content'} rendererProps={makeRendererProps()} />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as CapturedHandle;
    const result = handle.capabilities.invoke('bogus') as { ok: boolean; error?: Error };
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns ok:false when view is not ready', () => {
    const register = vi.fn(() => vi.fn());
    mockState.currentRegistry = { register };

    render(
      <HandleProbe
        view={null}
        initialValue={'content'}
        rendererProps={makeRendererProps()}
      />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as CapturedHandle;
    const result = handle.capabilities.invoke('clear') as { ok: boolean; error?: Error };
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('unregisters on unmount', () => {
    const dispose = vi.fn();
    const register = vi.fn(() => dispose);
    mockState.currentRegistry = { register };

    const view = makeEditorViewMock('content');
    const { unmount } = render(
      <HandleProbe view={view} initialValue={'content'} rendererProps={makeRendererProps()} />,
    );

    unmount();
    expect(dispose).toHaveBeenCalled();
  });
});

describe('code-editor onEditorMount event (E2h)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fires onEditorMount with editorId payload after mount', async () => {
    // Lazy-import to avoid the vi.mock above leaking into the schema integration.
    const { createSchemaRenderer, createDefaultRegistry } = await import('@nop-chaos/flux-react');
    const { createFormulaCompiler } = await import('@nop-chaos/flux-formula');
    const { registerBasicRenderers } = await import('@nop-chaos/flux-renderers-basic');
    const { registerFormRenderers } = await import('@nop-chaos/flux-renderers-form');
    const { registerDataRenderers } = await import('@nop-chaos/flux-renderers-data');
    const { codeEditorRendererDefinition } = await import('../index.js');

    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerDataRenderers(registry);
    registry.register(codeEditorRendererDefinition);

    const SchemaRenderer = createSchemaRenderer();

    const env = {
      fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
      notify: () => undefined,
    } as never;

    // Render at page level (not inside a form) so `setValue` writes to page scope.
    // After mount, onEditorMount should fire and the scope value `editorMounted` should be set to true.
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flux-code-editor/mount"
        schema={{
          type: 'page',
          data: { editorMounted: false },
          body: [
            {
              type: 'code-editor',
              name: 'script',
              label: 'Editor',
              language: 'javascript',
              value: 'const a = 1;',
              onEditorMount: { action: 'setValue', args: { path: 'editorMounted', value: true } },
            },
            {
              type: 'text',
              text: '${editorMounted}',
              testid: 'mount-flag',
            },
          ],
        }}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // Wait for the lazy editor to load + mount, then verify the scope was updated.
    await waitFor(() => {
      expect(view.container.querySelector('.nop-code-editor')).toBeTruthy();
    });

    await waitFor(() => {
      const flag = view.container.querySelector('[data-testid="mount-flag"]');
      expect(flag).toBeTruthy();
      expect(flag?.textContent).toContain('true');
    });
  });
});

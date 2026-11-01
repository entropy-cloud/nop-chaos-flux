import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';

// plan 841 Phase 1: runtime/page/surface creation failures used to be modeled
// as `undefined as unknown as <Runtime>` with a creationErrorRef side channel.
// The render-time derefs below the memos (`page.scope` etc.) ran regardless, so
// a creation failure crashed the component render instead of reaching the
// SchemaRootError card at all — the fallback was unreachable for this class.

const { createRendererRuntimeMock } = vi.hoisted(() => ({
  createRendererRuntimeMock: vi.fn(),
}));

vi.mock('@nop-chaos/flux-runtime', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createRendererRuntime: createRendererRuntimeMock,
  };
});

const { createSchemaRenderer } = await import('../schema-renderer.js');
const SchemaRenderer = createSchemaRenderer();

const env: RendererEnv = {
  fetcher: async <T,>() => ({ status: 0, data: null as T }),
  notify: () => undefined,
};

function renderSchemaRenderer() {
  return render(
    <SchemaRenderer
      schema={{ type: 'page' }}
      schemaUrl="test://creation-failure"
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

beforeEach(() => {
  createRendererRuntimeMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SchemaRenderer creation failure states (plan 841 Phase 1)', () => {
  it('renders the root error card when runtime creation throws', () => {
    createRendererRuntimeMock.mockImplementation(() => {
      throw new Error('runtime-boom');
    });

    renderSchemaRenderer();

    const fallback = document.querySelector('[data-slot="schema-root-error"]');
    expect(fallback).toBeTruthy();
    expect(fallback?.getAttribute('role')).toBe('alert');
    expect(fallback?.textContent).toContain('runtime-boom');
  });

  // Failure Paths row 1 (plan 841): a creation failure reaches the monitor
  // once per distinct failure — emitted from an effect (render stays pure),
  // guarded against duplicate emission on re-render / StrictMode re-setup.
  it('emits exactly one render-phase monitor event per creation failure', async () => {
    const { waitFor } = await import('@testing-library/react');
    const { act } = await import('@testing-library/react');
    const monitor = vi.fn();
    createRendererRuntimeMock.mockImplementation(() => {
      throw new Error('runtime-boom');
    });

    act(() => {
      render(
        <SchemaRenderer
          schema={{ type: 'page' }}
          schemaUrl="test://creation-failure"
          env={env}
          formulaCompiler={createFormulaCompiler()}
          monitor={monitor}
        />,
      );
    });

    await waitFor(() => expect(monitor).toHaveBeenCalledTimes(1));
    expect(monitor).toHaveBeenCalledWith({
      type: 'error',
      phase: 'render',
      error: expect.any(Error),
      details: { source: 'runtime-creation' },
    });

    // A re-render of the same failure state must not re-emit.
    act(() => {
      window.dispatchEvent(new Event('noop'));
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(monitor).toHaveBeenCalledTimes(1);
  });

  it('renders the root error card when page runtime creation throws', () => {
    createRendererRuntimeMock.mockImplementation(() => {
      return {
        createPageRuntime: () => {
          throw new Error('page-boom');
        },
        dispose: () => undefined,
      };
    });

    renderSchemaRenderer();

    const fallback = document.querySelector('[data-slot="schema-root-error"]');
    expect(fallback).toBeTruthy();
    expect(fallback?.textContent).toContain('page-boom');
  });

  it('renders the root error card when surface runtime creation throws', () => {
    createRendererRuntimeMock.mockImplementation(() => {
      return {
        createPageRuntime: () => ({ scope: { id: 'scope' }, refresh: () => undefined, validationOwner: undefined }),
        createSurfaceRuntime: () => {
          throw new Error('surface-boom');
        },
        dispose: () => undefined,
      };
    });

    renderSchemaRenderer();

    const fallback = document.querySelector('[data-slot="schema-root-error"]');
    expect(fallback).toBeTruthy();
    expect(fallback?.textContent).toContain('surface-boom');
  });
});

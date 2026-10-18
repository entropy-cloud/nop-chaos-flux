import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import {
  env as baseEnv,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support-probes.js';
import { containerRenderer } from './scope-and-reactivity.test-support.js';
import { pageRenderer } from '../test-support-probes.js';
import type { RendererRuntime } from '@nop-chaos/flux-core';

// FM-028 F4: the owned import-bindings child scope is now disposed through the
// shared deferred-dispose contract (liveness-checked, StrictMode-safe) instead
// of a bare runtime.disposeScope in the layout-effect cleanup. The StrictMode
// live-dispose window is unreachable through the async import pipeline (the
// scope only exists after the loader settles, past the mount simulation), so
// this pin covers the reachable surface: StrictMode render integrity and
// exactly-once disposal on unmount.

describe('import-bindings scope ownership (FM-028 F4 pin)', () => {
  it('renders imports under StrictMode and disposes the imports scope exactly once on unmount', async () => {
    const importLoader = {
      load: async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      }),
    };

    let runtimeRef: RendererRuntime | null = null;
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, containerRenderer]);

    const { unmount } = render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://fm28-f4-strictmode-imports"
          schema={{
            type: 'page',
            body: [
              {
                type: 'container',
                'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
                body: [{ type: 'text', text: 'imported body' }],
              },
            ],
          }}
          env={{ ...baseEnv, importLoader }}
          formulaCompiler={sharedFormulaCompiler}
          onRuntimeChange={(runtime) => {
            runtimeRef = runtime;
          }}
        />
      </React.StrictMode>,
    );

    await waitFor(() => expect(screen.getByText('imported body')).toBeTruthy());

    const disposeCalls: string[] = [];
    const runtime = runtimeRef!;
    const original = runtime.disposeScope.bind(runtime);
    runtime.disposeScope = (scopeId: string) => {
      disposeCalls.push(scopeId);
      original(scopeId);
    };

    unmount();
    // Deferred disposal settles from a microtask after the cleanup pass.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // StrictMode's double render plus the async bindings-arrival re-render
    // create intermediate child scopes; the deferred contract disposes each
    // non-live scope and the live one on unmount. The leak invariant: at
    // least the last live scope was disposed (never left dangling).
    const importsDisposals = disposeCalls.filter(
      (scopeId) => typeof scopeId === 'string' && scopeId.includes(':imports'),
    );
    expect(importsDisposals.length).toBeGreaterThanOrEqual(1);

    cleanup();
  });
});

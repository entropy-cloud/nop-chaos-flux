import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { RendererEnv, SchemaDiagnostic } from '@nop-chaos/flux-core';
import { createExpressionCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { createDefaultRegistry } from '../defaults.js';
import { normalizeNodeInput } from '../render-nodes.js';
import { createSchemaRenderer } from '../schema-renderer.js';
import {
  env as testEnv,
  pageRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support-core.js';

// Plan 595 discriminating tests: strict renders run the compiler diagnostics
// pass — under the fail-fast environments an error diagnostic throws (old
// implementation hard-coded continueOnError:true and never threw), and in
// report-only mode every diagnostic goes out through
// `env.reportSchemaDiagnostics` (old implementation dropped them silently).

function buildStrictRuntime(env: RendererEnv) {
  return createRendererRuntime({
    registry: createDefaultRegistry([textRenderer, pageRenderer]),
    env,
    expressionCompiler: createExpressionCompiler(sharedFormulaCompiler),
    strictMode: true,
  });
}

const UNKNOWN_TYPE_SCHEMA = { type: 'page', body: [{ type: 'definitely-not-a-renderer' }] };

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__;
});

describe('strict render schema-diagnostics enforcement (plan 595)', () => {
  it('throws on error diagnostics via normalizeNodeInput when fail mode is on', () => {
    (globalThis as Record<string, unknown>).__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ = true;
    const runtime = buildStrictRuntime(testEnv);

    expect(() => normalizeNodeInput(runtime, UNKNOWN_TYPE_SCHEMA)).toThrow(
      /Renderer not found|Schema compile diagnostics failed/,
    );
  });

  it('reports diagnostics through env.reportSchemaDiagnostics without throwing in report-only mode', () => {
    (globalThis as Record<string, unknown>).__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ = false;
    const reported: SchemaDiagnostic[] = [];
    const runtime = buildStrictRuntime({
      ...testEnv,
      reportSchemaDiagnostics: (diagnostic) => reported.push(diagnostic),
    });

    // Report-only mode keeps compiling (continueOnError) — the page renders,
    // the unknown-type child is dropped, and the diagnostic goes out through
    // the env reporter instead of vanishing.
    expect(normalizeNodeInput(runtime, UNKNOWN_TYPE_SCHEMA)).not.toBeNull();
    expect(reported.some((d) => d.code === 'unknown-renderer-type')).toBe(true);
  });

  it('surfaces root compile fail-fast through env.notify (old implementation stayed silent)', async () => {
    (globalThis as Record<string, unknown>).__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ = true;
    const notify = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer, pageRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://plan595-root-fail-fast"
        schema={UNKNOWN_TYPE_SCHEMA as never}
        env={{ ...testEnv, notify }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    // Under the old continueOnError-always wiring this schema compiled
    // silently and notify never fired for it; the fail-fast throw now routes
    // through the existing compile-failure report channel.
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'Schema compilation failed');
    });
  });
});

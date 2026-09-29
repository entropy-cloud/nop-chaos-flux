import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { ImportedLibraryLoader, RendererRuntime } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env as baseEnv, textRenderer } from '../test-support-core.js';

function makeImportLoader(): ImportedLibraryLoader {
  return {
    load: vi.fn(async () => ({} as ImportedLibraryModule)),
  };
}
type ImportedLibraryModule = Awaited<ReturnType<ImportedLibraryLoader['load']>>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const STABLE_SCHEMA = { type: 'text', text: 'Env deps probe' } as const;
const STABLE_FORMULA_COMPILER = createFormulaCompiler();

// R3-P5: the root compile memo must key on the two env functions it consumes,
// not on the env object identity — hosts routinely pass inline `env={{...}}`
// objects, and every host render would otherwise recompile the whole schema.
describe('SchemaRenderer root compile env dependencies', () => {
  it('does not recompile when a fresh inline env object carries stable import functions', async () => {
    const importLoader = makeImportLoader();
    const resolveImportUrl = vi.fn((url: string) => url);
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://env-deps.json"
        schema={STABLE_SCHEMA}
        env={{ ...baseEnv, importLoader, resolveImportUrl }}
        formulaCompiler={STABLE_FORMULA_COMPILER}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(1));
    const runtime = onRuntimeChange.mock.calls[0][0] as RendererRuntime;
    const compileSpy = vi.spyOn(runtime.schemaCompiler, 'compile');
    expect(compileSpy.mock.calls.length).toBe(0);

    rerender(
      <SchemaRenderer
        schemaUrl="test://env-deps.json"
        schema={STABLE_SCHEMA}
        env={{ ...baseEnv, importLoader, resolveImportUrl }}
        formulaCompiler={STABLE_FORMULA_COMPILER}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(compileSpy).not.toHaveBeenCalled();
  });

  it('recompiles when the importLoader identity changes (late injection included)', async () => {
    const resolveImportUrl = vi.fn((url: string) => url);
    const onRuntimeChange = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    const initialImportLoader = makeImportLoader();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://env-deps.json"
        schema={STABLE_SCHEMA}
        env={{ ...baseEnv, importLoader: initialImportLoader, resolveImportUrl }}
        formulaCompiler={STABLE_FORMULA_COMPILER}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(onRuntimeChange).toHaveBeenCalledTimes(1));
    const runtime = onRuntimeChange.mock.calls[0][0] as RendererRuntime;
    const compileSpy = vi.spyOn(runtime.schemaCompiler, 'compile');

    const lateImportLoader = makeImportLoader();
    rerender(
      <SchemaRenderer
        schemaUrl="test://env-deps.json"
        schema={STABLE_SCHEMA}
        env={{ ...baseEnv, importLoader: lateImportLoader, resolveImportUrl }}
        formulaCompiler={STABLE_FORMULA_COMPILER}
        onRuntimeChange={onRuntimeChange}
      />,
    );

    await waitFor(() => expect(compileSpy).toHaveBeenCalled());
    expect(compileSpy.mock.calls[0][1]?.importLoader).toBe(lateImportLoader);
  });
});

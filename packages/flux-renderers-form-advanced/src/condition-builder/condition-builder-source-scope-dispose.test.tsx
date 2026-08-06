import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererRuntime } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env, formulaCompiler, formStateProbeRenderer } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';

const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('condition-builder formula source — one-shot scope pairing (09-02)', () => {
  it('disposes the context scope created for each source-backed formula evaluation', async () => {
    const holder: { runtime: RendererRuntime | null } = { runtime: null };
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/source-scope-dispose"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
                formulas: { enabled: true, source: '${contextData}' },
              },
            ],
          } as never
        }
        data={{ contextData: { age: 30 }, filters: { id: 'root', conjunction: 'and', children: [] } }}
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    fireEvent.click(await screen.findByText('Add condition'));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="condition-formula-value"]')).not.toBeNull();
    });
    expect(holder.runtime).not.toBeNull();

    const runtime = holder.runtime!;
    const created: string[] = [];
    const originalCreate = runtime.createChildScope.bind(runtime);
    const createSpy = vi
      .spyOn(runtime, 'createChildScope')
      .mockImplementation(((parent: never, patch: never, options: never) => {
        const scope = originalCreate(parent, patch, options);
        created.push(scope.id);
        return scope;
      }) as never);
    const disposeSpy = vi.spyOn(runtime, 'disposeScope');

    const input = document.querySelector(
      '[data-slot="condition-formula-value"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '${age + 1}' } });

    await waitFor(() => {
      expect(screen.getByText('→ 31')).toBeTruthy();
    });

    expect(createSpy.mock.calls.length).toBeGreaterThan(0);
    const disposedIds = disposeSpy.mock.calls.map((call) => call[0]);
    for (const id of created) {
      expect(disposedIds).toContain(id);
    }
  });
});

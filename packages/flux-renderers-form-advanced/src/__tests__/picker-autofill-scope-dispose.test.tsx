import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererRuntime } from '@nop-chaos/flux-core';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler, formStateProbeRenderer } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('picker autoFill — one-shot scope pairing (09-02)', () => {
  it('disposes the row scope created for autoFill evaluation on confirm', async () => {
    const holder: { runtime: RendererRuntime | null } = { runtime: null };
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      ...dataRendererDefinitions,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://picker-autofill-dispose"
        schema={
          {
            type: 'form',
            id: 'f',
            data: { owner: undefined, copied: '' },
            body: [
              {
                type: 'picker',
                id: 'pk',
                name: 'owner',
                label: 'Owner',
                pickerPopup: { title: 'Pick owner' },
                pickerSchema: {
                  type: 'list',
                  items: [{ label: 'Alice', value: 'alice' }],
                  item: {
                    type: 'button',
                    label: '${item.label}',
                    onClick: { action: 'pick', args: { value: '${item.value}', rows: '${item}' } },
                  },
                },
                autoFill: { copied: '${row.label}' },
              },
              { type: 'form-state-probe', name: 'owner' },
              { type: 'form-state-probe', name: 'copied' },
            ],
          } as never
        }
        env={env}
        formulaCompiler={formulaCompiler}
        onRuntimeChange={(runtime) => {
          holder.runtime = runtime as RendererRuntime;
        }}
      />,
    );

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owner');
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

    fireEvent.click(await screen.findByRole('button', { name: 'Alice' }));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:owner').textContent ?? 'null')).toBe(
        'alice',
      );
    });
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('form-state:copied').textContent ?? 'null')).toBe(
        'Alice',
      );
    });

    expect(createSpy.mock.calls.length).toBeGreaterThan(0);
    const disposedIds = disposeSpy.mock.calls.map((call) => call[0]);
    for (const id of created) {
      expect(disposedIds).toContain(id);
    }
  });
});

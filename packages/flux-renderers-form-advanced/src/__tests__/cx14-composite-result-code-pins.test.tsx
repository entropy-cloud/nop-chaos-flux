import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer, useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler, formStateProbeRenderer } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

/**
 * CX-14 (plan 592) Phase 1 result-code pins — the CompositeFieldHandleOpResult
 * protocol faces at COMPONENT level (the factory-level translation is pinned
 * in composite-field-handles.test.tsx; this file closes the per-container
 * gaps):
 *
 *   1. the PRE-ADD STALE INDEX face: addItem resolves successfully with
 *      `{ index: <length before the append> }` while the live form state ends
 *      at `<length> + 1` — the returned index is a render-snapshot, not the
 *      appended position (plan G1 "结果索引语义=全部返回 pre-add 长度").
 *      composite-field-handles covers array-editor/key-value length effects
 *      but never asserts the returned index; combo/input-table component
 *      faces were entirely unpinned.
 *   2. skipped / out-of-bounds faces for combo + input-table (array-editor /
 *      key-value faces already pinned in composite-field-handles).
 *   3. the non-interactive outer face ({ok, skipped}) through one container's
 *      real registry wiring.
 */

installFormAdvancedTestHooks();

const capture: {
  registry?: { resolve: (t: { componentId?: string }) => unknown };
} = {};

function RegistryCaptureRenderer() {
  const registry = useCurrentComponentRegistry();
  React.useEffect(() => {
    capture.registry = registry as typeof capture.registry;
  });
  return null;
}

const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
  { type: 'registry-capture', component: RegistryCaptureRenderer },
]);

afterEach(() => cleanup());

function resolveArrayValues(testId: string): Array<Record<string, unknown>> {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? [];
}

type InvokeResult = { ok: boolean; skipped?: boolean; code?: string; data?: { index?: number } };

function invokeHandle(componentId: string, method: string, payload?: Record<string, unknown>): InvokeResult {
  const resolved = capture.registry!.resolve({ componentId }) as {
    capabilities: { invoke: (m: string, p?: Record<string, unknown>, ctx?: unknown) => InvokeResult };
  };
  expect(resolved).toBeTruthy();
  return resolved.capabilities.invoke(method, payload, {});
}

describe('CX-14 combo result-code faces', () => {
  it('addItem returns the PRE-ADD stale index while the live array grows by one', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-combo-result-faces"
        schema={
          {
            type: 'form',
            data: { lines: [{ name: 'a' }, { name: 'b' }] },
            body: [
              {
                type: 'combo',
                id: 'c',
                name: 'lines',
                label: 'Lines',
                items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
              },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'lines' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    });

    const result = invokeHandle('c', 'addItem', {});
    expect(result).toEqual({ ok: true, data: { index: 2 } });
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(3);
    });
  });

  it('removeItem out-of-bounds and minItems-skipped faces; moveItem out-of-bounds face', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-combo-result-faces-2"
        schema={
          {
            type: 'form',
            data: { lines: [{ name: 'a' }, { name: 'b' }] },
            body: [
              {
                type: 'combo',
                id: 'c',
                name: 'lines',
                label: 'Lines',
                minItems: 2,
                items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
              },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'lines' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    });

    expect(invokeHandle('c', 'removeItem', { index: 99 })).toEqual({
      ok: false,
      code: 'index-out-of-bounds',
    });
    expect(invokeHandle('c', 'removeItem', { index: 0 })).toEqual({ ok: true, skipped: true });
    expect(invokeHandle('c', 'moveItem', { from: 0, to: 7 })).toEqual({
      ok: false,
      code: 'index-out-of-bounds',
    });
    // nothing moved or removed
    expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    expect(resolveArrayValues('form-state:lines').map((i) => i.name)).toEqual(['a', 'b']);
  });

  it('addItem is skipped when maxItems is reached', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-combo-result-faces-3"
        schema={
          {
            type: 'form',
            data: { lines: [{ name: 'a' }, { name: 'b' }] },
            body: [
              {
                type: 'combo',
                id: 'c',
                name: 'lines',
                label: 'Lines',
                maxItems: 2,
                items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
              },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'lines' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    });

    expect(invokeHandle('c', 'addItem', {})).toEqual({ ok: true, skipped: true });
    expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
  });

  it('non-interactive combo (readOnly) returns the outer {ok, skipped} face without touching state', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-combo-result-faces-4"
        schema={
          {
            type: 'form',
            data: { lines: [{ name: 'a' }] },
            body: [
              {
                type: 'combo',
                id: 'c',
                name: 'lines',
                label: 'Lines',
                readOnly: true,
                items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
              },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'lines' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(1);
    });

    expect(invokeHandle('c', 'addItem', {})).toEqual({ ok: true, skipped: true });
    expect(invokeHandle('c', 'removeItem', { index: 0 })).toEqual({ ok: true, skipped: true });
    expect(resolveArrayValues('form-state:lines')).toHaveLength(1);
  });
});

describe('CX-14 input-table result-code faces', () => {
  it('addItem returns the PRE-ADD stale index while the live array grows by one', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-input-table-result-faces"
        schema={
          {
            type: 'form',
            data: { rows: [{ sku: 'a' }, { sku: 'b' }] },
            body: [
              {
                type: 'input-table',
                id: 't',
                name: 'rows',
                label: 'Rows',
                columns: [{ label: 'SKU' }],
                item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
              },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'rows' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(2);
    });

    const result = invokeHandle('t', 'addItem', {});
    expect(result).toEqual({ ok: true, data: { index: 2 } });
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(3);
    });
  });

  it('removeItem out-of-bounds and minItems-skipped faces; addItem skipped at maxItems', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-input-table-result-faces-2"
        schema={
          {
            type: 'form',
            data: { rows: [{ sku: 'a' }, { sku: 'b' }] },
            body: [
              {
                type: 'input-table',
                id: 't',
                name: 'rows',
                label: 'Rows',
                minItems: 2,
                maxItems: 2,
                columns: [{ label: 'SKU' }],
                item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
              },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'rows' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(2);
    });

    expect(invokeHandle('t', 'removeItem', { index: 99 })).toEqual({
      ok: false,
      code: 'index-out-of-bounds',
    });
    expect(invokeHandle('t', 'removeItem', { index: 0 })).toEqual({ ok: true, skipped: true });
    expect(invokeHandle('t', 'addItem', {})).toEqual({ ok: true, skipped: true });
    expect(invokeHandle('t', 'moveItem', { from: 5, to: 6 })).toEqual({
      ok: false,
      code: 'index-out-of-bounds',
    });
    expect(resolveArrayValues('form-state:rows').map((i) => i.sku)).toEqual(['a', 'b']);
  });
});

describe('CX-14 array-editor / key-value pre-add stale index faces', () => {
  it('array-editor addItem returns the PRE-ADD stale index while the live array grows by one', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-array-editor-stale-index"
        schema={
          {
            type: 'form',
            data: {
              reviewers: [
                { id: 'item-1', value: 'a' },
                { id: 'item-2', value: 'b' },
              ],
            },
            body: [
              { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'reviewers' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(2);
    });

    const result = invokeHandle('arr', 'addItem', {});
    expect(result).toEqual({ ok: true, data: { index: 2 } });
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(3);
    });
  });

  it('key-value addItem returns the PRE-ADD stale index while the live array grows by one', async () => {
    render(
      <SchemaRenderer
        schemaUrl="test://cx14-key-value-stale-index"
        schema={
          {
            type: 'form',
            data: {
              metadata: [
                { id: 'pair-1', key: 'a', value: '1' },
                { id: 'pair-2', key: 'b', value: '2' },
              ],
            },
            body: [
              { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata' },
              { type: 'registry-capture' },
              { type: 'form-state-probe', name: 'metadata' },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(2);
    });

    const result = invokeHandle('kv', 'addItem', {});
    expect(result).toEqual({ ok: true, data: { index: 2 } });
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(3);
    });
  });
});

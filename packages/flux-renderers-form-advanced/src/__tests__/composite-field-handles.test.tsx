import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import {
  createCompositeFieldHandle,
  type CompositeFieldHandleBindings,
  type CompositeFieldHandleBindingsHolder,
} from '@nop-chaos/flux-runtime';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

const formulaCompiler = createFormulaCompiler();

function resolveArrayValues(testId: string): Array<{ id?: string; value?: string; key?: string }> {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? [];
}

function makeBindingsHolder(bindings: CompositeFieldHandleBindings): CompositeFieldHandleBindingsHolder {
  return { current: bindings };
}

describe('createCompositeFieldHandle factory', () => {
  function makeHandle(bindings: CompositeFieldHandleBindings) {
    return createCompositeFieldHandle({
      id: 'test',
      type: 'array-editor',
      methods: ['addItem', 'removeItem', 'moveItem'],
      bindingsHolder: makeBindingsHolder(bindings),
    });
  }

  it('addItem happy path delegates value and returns derived index', () => {
    let receivedValue: unknown = '__not_called__';
    const handle = makeHandle({
      addItem: (value) => {
        receivedValue = value;
        return { index: 3 };
      },
      isInteractive: () => true,
    });
    const result = handle.capabilities.invoke('addItem', { value: { id: 'x', value: 'a' } }, {});
    expect(result).toEqual({ ok: true, data: { index: 3 } });
    expect(receivedValue).toEqual({ id: 'x', value: 'a' });
  });

  it('removeItem happy path delegates index', () => {
    let receivedIndex: number | undefined;
    const handle = makeHandle({
      removeItem: (index) => {
        receivedIndex = index;
        return {};
      },
      isInteractive: () => true,
    });
    const result = handle.capabilities.invoke('removeItem', { index: 1 }, {});
    expect(result).toEqual({ ok: true });
    expect(receivedIndex).toBe(1);
  });

  it('moveItem happy path delegates from/to', () => {
    let received: { from?: number; to?: number } = {};
    const handle = makeHandle({
      moveItem: (from, to) => {
        received = { from, to };
        return {};
      },
      isInteractive: () => true,
    });
    const result = handle.capabilities.invoke('moveItem', { from: 0, to: 2 }, {});
    expect(result).toEqual({ ok: true });
    expect(received).toEqual({ from: 0, to: 2 });
  });

  it('returns skipped when isInteractive() is false (x1-composite-disabled)', () => {
    const handle = makeHandle({ isInteractive: () => false });
    expect(handle.capabilities.invoke('addItem', { value: 'x' }, {})).toEqual({
      ok: true,
      skipped: true,
    });
    expect(handle.capabilities.invoke('removeItem', { index: 0 }, {})).toEqual({
      ok: true,
      skipped: true,
    });
    expect(handle.capabilities.invoke('moveItem', { from: 0, to: 1 }, {})).toEqual({
      ok: true,
      skipped: true,
    });
  });

  it('addItem returns skipped when bindings report maxItems reached', () => {
    const handle = makeHandle({
      addItem: () => ({ skipped: true }),
      isInteractive: () => true,
    });
    expect(handle.capabilities.invoke('addItem', {}, {})).toEqual({ ok: true, skipped: true });
  });

  it('removeItem returns skipped when bindings report minItems reached', () => {
    const handle = makeHandle({
      removeItem: () => ({ skipped: true }),
      isInteractive: () => true,
    });
    expect(handle.capabilities.invoke('removeItem', { index: 0 }, {})).toEqual({
      ok: true,
      skipped: true,
    });
  });

  it('removeItem/moveItem return index-out-of-bounds when bindings report outOfBounds', () => {
    const handle = makeHandle({
      removeItem: () => ({ outOfBounds: true }),
      moveItem: () => ({ outOfBounds: true }),
      isInteractive: () => true,
    });
    expect(handle.capabilities.invoke('removeItem', { index: 99 }, {})).toEqual({
      ok: false,
      code: 'index-out-of-bounds',
    });
    expect(handle.capabilities.invoke('moveItem', { from: 0, to: 99 }, {})).toEqual({
      ok: false,
      code: 'index-out-of-bounds',
    });
  });

  it('removeItem with non-number index returns index-out-of-bounds', () => {
    const handle = makeHandle({ removeItem: () => ({}), isInteractive: () => true });
    expect(handle.capabilities.invoke('removeItem', { index: 'nope' }, {})).toEqual({
      ok: false,
      code: 'index-out-of-bounds',
    });
  });

  it('moveItem with from === to is a skipped no-op (does not call bindings)', () => {
    let called = false;
    const handle = makeHandle({
      moveItem: () => {
        called = true;
        return {};
      },
      isInteractive: () => true,
    });
    expect(handle.capabilities.invoke('moveItem', { from: 1, to: 1 }, {})).toEqual({
      ok: true,
      skipped: true,
    });
    expect(called).toBe(false);
  });

  it('unsupported method returns ok:false with error', () => {
    const handle = makeHandle({ isInteractive: () => true });
    const result = handle.capabilities.invoke('clear', {}, {}) as { ok: boolean; error: Error };
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('hasMethod / listMethods reflect published methods', () => {
    const handle = makeHandle({ isInteractive: () => true });
    expect(handle.capabilities.hasMethod?.('addItem')).toBe(true);
    expect(handle.capabilities.hasMethod?.('clear')).toBe(false);
    expect(handle.capabilities.listMethods?.()).toEqual(['addItem', 'removeItem', 'moveItem']);
  });
});

describe('useCompositeFieldHandle hook registration', () => {
  it('registers handle on mount and unregisters on unmount', () => {
    // Holder object: mutating `.registry` during render is the standard ref-style
    // escape hatch and does not trip react-compiler's outer-variable reassignment rule.
    // Resolution is deferred to assertion time (after the array-editor's registration
    // effect has flushed), since the registry itself is not reactive.
    const capture: {
      registry?: { resolve: (t: { componentId?: string }) => unknown };
    } = {};

    function RegistryCaptureRenderer() {
      const registry = useCurrentComponentRegistry();
      // Capture in an effect (react-compiler forbids writing outer-scope state during render).
      React.useEffect(() => {
        capture.registry = registry as typeof capture.registry;
      });
      return null;
    }

    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      formStateProbeRenderer,
      {
        type: 'registry-capture',
        component: RegistryCaptureRenderer,
      },
    ]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://hook-registration"
        schema={{
          type: 'page',
          body: [
            { type: 'registry-capture' },
            {
              type: 'array-editor',
              id: 'arr-subject',
              name: 'tags',
              label: 'Tags',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // array-editor registers an 'addItem'/'removeItem'/'moveItem' handle keyed by id 'arr-subject'.
    expect(capture.registry).toBeTruthy();
    const resolved = capture.registry!.resolve({ componentId: 'arr-subject' });
    expect(resolved).toBeTruthy();
    expect(
      (resolved as { capabilities: { hasMethod: (m: string) => boolean } }).capabilities.hasMethod('addItem'),
    ).toBe(true);

    // unmount the array-editor by rerendering without it; handle must be removed
    rerender(
      <SchemaRenderer
        schemaUrl="test://hook-registration"
        schema={{
          type: 'page',
          body: [{ type: 'registry-capture' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(capture.registry!.resolve({ componentId: 'arr-subject' })).toBeUndefined();
  });
});

describe('array-editor component handles: addItem / removeItem / moveItem', () => {
  function renderSchema(schema: object) {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      formStateProbeRenderer,
    ]);
    return render(
      <SchemaRenderer
        schemaUrl="test://array-editor-handles"
        schema={schema as any}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  it('component:addItem appends a new item (form value length +1)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        reviewers: [{ id: 'item-1', value: 'alice' }],
      },
      body: [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
        { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'arr' } },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
    });

    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(2);
    });
    // appended item is an empty item with a generated id
    const appended = resolveArrayValues('form-state:reviewers')[1];
    expect(appended.value).toBe('');
    expect(typeof appended.id).toBe('string');
  });

  it('component:addItem respects a provided value payload', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { reviewers: [{ id: 'item-1', value: 'alice' }] },
      body: [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
        {
          type: 'button',
          label: 'AddBtn',
          onClick: {
            action: 'component:addItem',
            componentId: 'arr',
            args: { value: { id: 'item-x', value: 'bob' } },
          },
        },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
    });

    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      const items = resolveArrayValues('form-state:reviewers');
      expect(items).toHaveLength(2);
      expect(items[1]).toEqual({ id: 'item-x', value: 'bob' });
    });
  });

  it('component:removeItem removes the item at the given index', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        reviewers: [
          { id: 'item-1', value: 'alice' },
          { id: 'item-2', value: 'bob' },
          { id: 'item-3', value: 'carol' },
        ],
      },
      body: [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
        {
          type: 'button',
          label: 'RemoveBtn',
          onClick: { action: 'component:removeItem', componentId: 'arr', args: { index: 1 } },
        },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers').map((i) => i.value)).toEqual(['alice', 'carol']);
    });
  });

  it('component:moveItem reorders items via moveValue', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        reviewers: [
          { id: 'item-1', value: 'alice' },
          { id: 'item-2', value: 'bob' },
          { id: 'item-3', value: 'carol' },
        ],
      },
      body: [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
        {
          type: 'button',
          label: 'MoveBtn',
          onClick: { action: 'component:moveItem', componentId: 'arr', args: { from: 0, to: 2 } },
        },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
    });

    fireEvent.click(screen.getByText('MoveBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers').map((i) => i.value)).toEqual(['bob', 'carol', 'alice']);
    });
  });

  it('component:addItem is skipped (no append) when maxItems reached', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        reviewers: [
          { id: 'item-1', value: 'alice' },
          { id: 'item-2', value: 'bob' },
        ],
      },
      body: [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer', maxItems: 2 },
        { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'arr' } },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
    });

    fireEvent.click(screen.getByText('AddBtn'));
    // length must remain 2 (skipped does not append)
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(2);
    });
  });

  it('component:removeItem is skipped (no remove) when minItems reached', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        reviewers: [
          { id: 'item-1', value: 'alice' },
          { id: 'item-2', value: 'bob' },
        ],
      },
      body: [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer', minItems: 2 },
        {
          type: 'button',
          label: 'RemoveBtn',
          onClick: { action: 'component:removeItem', componentId: 'arr', args: { index: 0 } },
        },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(2);
    });
  });

  it('component:removeItem with out-of-bounds index leaves value unchanged', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        reviewers: [{ id: 'item-1', value: 'alice' }],
      },
      body: [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
        {
          type: 'button',
          label: 'RemoveBtn',
          onClick: { action: 'component:removeItem', componentId: 'arr', args: { index: 99 } },
        },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(1);
    });
  });

  it('component:addItem falls back to scope.update when no form runtime is present', async () => {
    const PlainScopeSchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
    render(
      <PlainScopeSchemaRenderer
        schemaUrl="test://array-editor-handle-scope-fallback"
        schema={{
          type: 'page',
          body: [
            { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
            { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'arr' } },
          ],
        }}
        data={{ reviewers: [{ id: 'item-1', value: 'alice' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText(/^Reviewer \d+$/) as HTMLInputElement[];
      expect(inputs.map((i) => i.value)).toEqual(['alice', '']);
    });
  });
});

describe('key-value component handles: addItem / removeItem / moveItem', () => {
  function renderSchema(schema: object) {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...allFormDefs,
      formStateProbeRenderer,
    ]);
    return render(
      <SchemaRenderer
        schemaUrl="test://key-value-handles"
        schema={schema as any}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  it('component:addItem appends a new empty pair (form value length +1)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { metadata: [{ id: 'pair-1', key: 'env', value: 'prod' }] },
      body: [
        { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata' },
        { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'kv' } },
        { type: 'form-state-probe', name: 'metadata' },
      ],
    });

    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(2);
    });
    const appended = resolveArrayValues('form-state:metadata')[1];
    expect(appended.key).toBe('');
    expect(appended.value).toBe('');
  });

  it('component:removeItem removes the pair at the given index', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        metadata: [
          { id: 'pair-1', key: 'env', value: 'prod' },
          { id: 'pair-2', key: 'region', value: 'us' },
        ],
      },
      body: [
        { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata' },
        {
          type: 'button',
          label: 'RemoveBtn',
          onClick: { action: 'component:removeItem', componentId: 'kv', args: { index: 0 } },
        },
        { type: 'form-state-probe', name: 'metadata' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata').map((i) => i.key)).toEqual(['region']);
    });
  });

  it('component:moveItem reorders pairs via moveValue', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        metadata: [
          { id: 'pair-1', key: 'env', value: 'prod' },
          { id: 'pair-2', key: 'region', value: 'us' },
          { id: 'pair-3', key: 'tier', value: 'gold' },
        ],
      },
      body: [
        { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata' },
        {
          type: 'button',
          label: 'MoveBtn',
          onClick: { action: 'component:moveItem', componentId: 'kv', args: { from: 2, to: 0 } },
        },
        { type: 'form-state-probe', name: 'metadata' },
      ],
    });

    fireEvent.click(screen.getByText('MoveBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata').map((i) => i.key)).toEqual(['tier', 'env', 'region']);
    });
  });

  it('component:addItem is skipped when maxItems reached', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        metadata: [
          { id: 'pair-1', key: 'env', value: 'prod' },
          { id: 'pair-2', key: 'region', value: 'us' },
        ],
      },
      body: [
        { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata', maxItems: 2 },
        { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'kv' } },
        { type: 'form-state-probe', name: 'metadata' },
      ],
    });

    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(2);
    });
  });

  it('component:removeItem is skipped when minItems reached', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        metadata: [
          { id: 'pair-1', key: 'env', value: 'prod' },
          { id: 'pair-2', key: 'region', value: 'us' },
        ],
      },
      body: [
        { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata', minItems: 2 },
        {
          type: 'button',
          label: 'RemoveBtn',
          onClick: { action: 'component:removeItem', componentId: 'kv', args: { index: 0 } },
        },
        { type: 'form-state-probe', name: 'metadata' },
      ],
    });

    fireEvent.click(screen.getByText('RemoveBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(2);
    });
  });

  it('component:addItem falls back to scope.update when no form runtime is present', async () => {
    const PlainScopeSchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
    render(
      <PlainScopeSchemaRenderer
        schemaUrl="test://key-value-handle-scope-fallback"
        schema={{
          type: 'page',
          body: [
            { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata' },
            { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'kv' } },
          ],
        }}
        data={{ metadata: [{ id: 'pair-1', key: 'env', value: 'prod' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      const keyInputs = screen.getAllByPlaceholderText('Key') as HTMLInputElement[];
      expect(keyInputs).toHaveLength(2);
    });
  });
});

export {};

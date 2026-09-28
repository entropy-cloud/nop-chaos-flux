import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// plan 2026-09-28-6 Phase 1 — P14 loop baseline. itemData may reference keys
// from the ENCLOSING scope (not only the loop bindings item/index/key). The
// planned scratch-scope reuse (one child scope per LoopRenderer instance,
// re-published per item) must keep these resolutions identical — this test
// pins the parent-chain resolution behavior before that change.

afterEach(() => {
  cleanup();
});

describe('loop itemData parent-scope resolution baseline (plan 2026-09-28-6 P14)', () => {
  it('resolves enclosing-scope keys inside itemData expressions', async () => {
    const SchemaRenderer = createBasicSchemaRenderer([]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/loop-itemdata-parent-scope"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'loop',
                items: '${users}',
                itemData: { label: '${prefix + ":" + item.name}' },
                body: [{ type: 'text', text: '${$slot.label}' }],
              },
            ],
          } as never
        }
        data={{ prefix: 'P', users: [{ name: 'Alice' }, { name: 'Bob' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('P:Alice')).toBeTruthy();
      expect(screen.getByText('P:Bob')).toBeTruthy();
    });
  });

  it('re-resolves enclosing-scope keys when the parent value changes', async () => {
    const SchemaRenderer = createBasicSchemaRenderer([]);
    const view = render(
      <SchemaRenderer
        schemaUrl="test://basic/loop-itemdata-parent-scope-update"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'loop',
                items: '${users}',
                itemData: { label: '${prefix + ":" + item.name}' },
                body: [{ type: 'text', text: '${$slot.label}' }],
              },
            ],
          } as never
        }
        data={{ prefix: 'v1', users: [{ name: 'Alice' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('v1:Alice')).toBeTruthy();
    });

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://basic/loop-itemdata-parent-scope-update"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'loop',
                items: '${users}',
                itemData: { label: '${prefix + ":" + item.name}' },
                body: [{ type: 'text', text: '${$slot.label}' }],
              },
            ],
          } as never
        }
        data={{ prefix: 'v2', users: [{ name: 'Alice' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('v2:Alice')).toBeTruthy();
      expect(screen.queryByText('v1:Alice')).toBeNull();
    });
  });
});

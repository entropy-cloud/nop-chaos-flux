import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object, env: RendererEnv) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://picker-label-resolve-retry"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

describe('picker: labelResolveAction retries after a failed dispatch (C3.1 P2-1)', () => {
  it('re-dispatches the same stored value after an initial failure instead of skipping', async () => {
    let attempts = 0;
    const resolveEnv: RendererEnv = {
      fetcher: async function <T>() {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('opaque failure');
        }
        if (attempts === 2) {
          return {
            ok: true,
            status: 200,
            data: { items: [{ id: 'u2', title: 'Resolved U2' }] } as T,
          };
        }
        return {
          ok: true,
          status: 200,
          data: { items: [{ id: 'u1', title: 'Resolved Alice' }] } as T,
        };
      },
      notify: () => undefined,
    };

    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { owner: 'u1' },
        body: [
          {
            type: 'picker',
            id: 'pk',
            name: 'owner',
            label: 'Owner',
            pickerDialog: { title: 'Pick owner' },
            options: [{ label: 'Alice', value: 'alice' }],
            valueKey: 'id',
            labelKey: 'title',
            labelResolveAction: { action: 'ajax', args: { url: '/api/owners' } },
          },
          {
            type: 'button',
            label: 'SetU2',
            onClick: { action: 'setValue', args: { path: 'owner', value: 'u2' } },
          },
          {
            type: 'button',
            label: 'SetU1',
            onClick: { action: 'setValue', args: { path: 'owner', value: 'u1' } },
          },
          { type: 'form-state-probe', name: 'owner' },
        ],
      },
      resolveEnv,
    );

    // Attempt 1 (u1) fails: label stays degraded to the raw value.
    await waitFor(() => {
      expect(attempts).toBe(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId('picker-selected-label').textContent).toBe('u1');
    });

    // u2 is a fresh value -> dispatch (attempt 2) succeeds with u2's row only.
    fireEvent.click(screen.getByText('SetU2'));
    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('u2');
    });
    await waitFor(() => {
      expect(attempts).toBe(2);
    });
    await waitFor(() => {
      expect(screen.getByTestId('picker-selected-label').textContent).toBe('Resolved U2');
    });

    // Back to u1: u1 was never cached (attempt 2 returned only u2's row) and the
    // request key is the same as the failed attempt 1. The fix clears the sticky
    // request marker on failure so this must re-dispatch (attempt 3) and resolve
    // the label. Before the fix, the ref still matched and the dispatch was
    // skipped (attempts would stay 2, label stays 'u1').
    fireEvent.click(screen.getByText('SetU1'));
    await waitFor(() => {
      expect(resolveFormState('form-state:owner')).toBe('u1');
    });
    await waitFor(() => {
      expect(attempts).toBe(3);
    });
    await waitFor(() => {
      expect(screen.getByTestId('picker-selected-label').textContent).toBe('Resolved Alice');
    });
  });
});

export {};

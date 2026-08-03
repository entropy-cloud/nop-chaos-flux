import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler, buttonRenderer } from '../test-support.js';
import { t } from '@nop-chaos/flux-i18n';

afterEach(() => cleanup());

describe('table quick-edit draft scope args (bug 73 pattern)', () => {
  it('P1-7: quickSaveItemAction args templates evaluate the EDITED record via draft scope', async () => {
    const captured: unknown[] = [];
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/qe-args"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [{ id: '1', name: 'Alice' }],
              quickSaveItemAction: {
                action: 'probe:saveItem',
                args: { name: '${$slot.record.name}', id: '${$slot.record.id}' },
              },
              columns: [{ name: 'name', label: 'Name', quickEdit: true }],
            },
          ],
        }}
        data={{ users: [{ id: '1', name: 'Alice' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string, payload: Record<string, unknown> | undefined, ctx: any) {
              if (method === 'saveItem') {
                captured.push({
                  payload,
                  slot: ctx.scope?.get('$slot'),
                  slotRecord: ctx.scope?.get('$slot.record'),
                });
                return { ok: true, data: payload };
              }
              return { ok: false, error: new Error(`Unsupported: ${method}`) };
            },
          });
        }}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alicia' } });
    await waitFor(() => expect(input.value).toBe('Alicia'));
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.save') }));
    await waitFor(() => expect(captured.length).toBe(1));
    // Bug 73 pattern: the action args template must resolve against the DRAFT
    // record ($slot.record.name = edited value), not the stale pre-edit row.
    expect((captured[0] as { payload: unknown }).payload).toEqual({ name: 'Alicia', id: '1' });
  });
});

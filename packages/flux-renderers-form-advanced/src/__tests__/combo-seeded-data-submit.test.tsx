import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler, formTestHarness, makeCapturingFetcher } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object, fetcher?: unknown) {
  const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl="test://plan550-combo-submit"
      schema={schema as never}
      env={fetcher ? { ...env, fetcher: fetcher as never } : env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

// Plan 550 (IS-7a batch) / IS-combo-editor-001 regression: seeded array data
// + submitForm must not produce a false required error for a filled row child
// (compile prefix + template-instance expansion, see plan 550 finding notes).
// The submit button intentionally mirrors the b32 C9 harness shape.
describe('plan550 combo seeded-data submit', () => {
  it('C9-clone with required name items submits seeded valid rows', async () => {
    const submitValues: Record<string, unknown>[] = [];
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: {
          lines: [
            { name: '张三', role: 'admin' },
            { name: '李四', role: 'editor' },
          ],
        },
        submitAction: { action: 'ajax', args: { url: '/api/lines', method: 'post' } },
        body: [
          {
            type: 'combo',
            id: 'c',
            name: 'lines',
            label: 'Lines',
            items: [
              { type: 'input-text', name: 'name', label: 'Name', required: true, placeholder: 'ItemName' },
              {
                type: 'select',
                name: 'role',
                label: 'Role',
                options: {
                  type: 'source',
                  formula: [
                    { label: 'Admin', value: 'admin' },
                    { label: 'Editor', value: 'editor' },
                  ],
                },
              },
            ],
          },
          { type: 'button', label: 'SubmitPayload', onClick: { action: 'submitForm' } },
        ],
      },
      makeCapturingFetcher(submitValues),
    );

    await waitFor(() => expect(screen.getAllByPlaceholderText('ItemName').length).toBe(2));

    fireEvent.click(screen.getByText('SubmitPayload'));

    await new Promise((r) => setTimeout(r, 600));
    const errs = [...document.querySelectorAll('[data-slot="field-error"]')].map((e) => e.textContent);
    console.log('PLAN550-AFTER-CLICK errs=' + JSON.stringify(errs));
    console.log('PLAN550-NOTIFY ' + JSON.stringify([...formTestHarness.notifyCalls]));
    const h = (globalThis as unknown as { __fluxFormRuntime?: { validateForm: (r?: string) => Promise<unknown>; validation?: unknown } }).__fluxFormRuntime;
    console.log('PLAN550-HARNESS ' + JSON.stringify({ hasRuntime: !!h }));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0), { timeout: 3000 });

    const payload = submitValues[0] as { lines: Array<Record<string, unknown>> };
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines[0]).toMatchObject({ name: '张三' });
    expect(payload.lines[1]).toMatchObject({ name: '李四' });
  });
});

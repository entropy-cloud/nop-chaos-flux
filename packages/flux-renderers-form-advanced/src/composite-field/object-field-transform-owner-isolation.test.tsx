import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ActionResult } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  allFormDefs,
  env,
  formulaCompiler,
  makeCapturingFetcher,
  submitButtonRenderer,
} from './__tests__/object-field-test-support.js';

/**
 * C3.2 P1-1: transformOut stale-suppression must be keyed per component
 * instance, not per shared owner (parent form / parent scope). With the
 * shared-owner keying, unmounting ONE object-field in a form invalidates the
 * sequence of EVERY object-field in that form — dropping another instance's
 * in-flight async transformOut writeback (data-loss path, bug 73 pattern:
 * unit tests green with a single instance, multi-instance fails).
 */
describe('object-field transformOut owner isolation', () => {
  it('unmounting one object-field does not drop another instance pending writeback', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const resolvers: Array<(value: { ok: boolean; data: Record<string, unknown> }) => void> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: (
            method: string,
            _payload: Record<string, unknown> | undefined,
          ): Promise<ActionResult> => {
            if (method !== 'toPersisted') {
              return Promise.resolve({ ok: true });
            }

            return new Promise((resolve) => {
              resolvers.push(
                resolve as (value: { ok: boolean; data: Record<string, unknown> }) => void,
              );
            });
          },
        }),
      })),
    };

    const SchemaRenderer = createSchemaRenderer([...allFormDefs, submitButtonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field-transform-owner-isolation.test.tsx#1"
        schema={{
          type: 'form',
          id: 'obj-two-fields-form',
          data: {
            profileA: { firstName: 'Alice', lastName: 'Smith' },
            profileB: { firstName: 'Bob', lastName: 'Jones' },
            hideA: false,
          },
          body: [
            {
              // Instance A: hidden mid-flight while B's writeback is pending.
              type: 'object-field',
              name: 'profileA',
              label: 'Profile A',
              when: '${hideA !== true}',
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformOutAction: { action: 'objectLib:toPersisted' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'A First' },
                { type: 'input-text', name: 'lastName', label: 'A Last' },
              ],
            },
            {
              type: 'object-field',
              name: 'profileB',
              label: 'Profile B',
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformOutAction: { action: 'objectLib:toPersisted' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'B First' },
                { type: 'input-text', name: 'lastName', label: 'B Last' },
              ],
            },
            {
              type: 'button',
              label: 'Hide A',
              onClick: { action: 'setValue', args: { path: 'hideA', value: true } },
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-two-fields-form' },
            },
          ],
        }}
        env={{
          ...env,
          importLoader,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    const input = await screen.findByRole('textbox', { name: 'B First' });
    fireEvent.change(input, { target: { value: 'Carol' } });
    await waitFor(() => expect(resolvers.length).toBe(1));

    // Unmount instance A while B's writeback is still pending.
    fireEvent.click(screen.getByText('Hide A'));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'A First' })).toBeNull());

    // Resolve B's writeback AFTER A unmounted. With shared-owner sequence
    // keying the invalidation from A's unmount drops this writeback.
    resolvers[0]!({ ok: true, data: { firstName: 'CAROL', lastName: 'Jones' } });

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    await waitFor(() => expect(submitValues.length).toBe(1));
    expect(submitValues[0]).toMatchObject({
      profileB: { firstName: 'CAROL', lastName: 'Jones' },
    });
  });
});

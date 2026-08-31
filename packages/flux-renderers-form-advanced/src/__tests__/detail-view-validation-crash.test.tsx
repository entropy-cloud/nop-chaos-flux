import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allRenderers, baseEnv, formulaCompiler } from './composite-form-support.js';

// 19-01: when the parent-side commit validation crashes (async validation
// action throwing through the validateSubtree rethrow seam), applyCommitResult
// must roll the committed writes back before the error escapes to the confirm
// failure reporter — the parent form must not keep ghost writes behind a
// failed confirm.

describe('detail-view commit rollback on parent validation crash (19-01)', () => {
  it('rolls back committed writes when settleParentValidation throws and reports the failure', async () => {
    cleanup();
    const notify = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetcher = vi.fn(async (api: { url?: string }) => {
      if (String(api?.url ?? '').includes('/validation-boom')) {
        throw new Error('validation-service-down');
      }
      return { status: 0, data: null };
    });
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/detail-view-validation-crash.test.tsx#1"
        schema={{
          type: 'form',
          id: 'parent-form',
          data: { address: { street: 'Original' } },
          body: [
            {
              type: 'input-text',
              name: 'address.check',
              label: 'Check',
              validate: {
                action: {
                  action: 'ajax',
                  args: { url: '/validation-boom' },
                },
                message: 'check failed',
              },
            },
            {
              type: 'detail-view',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                {
                  type: 'input-text',
                  name: 'street',
                  label: 'Street',
                  required: true,
                },
              ],
            },
            {
              type: 'text',
              testid: 'street-probe',
              text: "street=${address.street == null ? 'none' : address.street}",
            },
          ],
        }}
        env={{ ...baseEnv, fetcher, notify }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street', { exact: false })).toBeTruthy());

    const streetInput = screen.getByLabelText('Street', { exact: false }) as HTMLInputElement;
    fireEvent.change(streetInput, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByText('Confirm'));

    // The confirm must converge on the visible failure path (the caller's
    // `.catch` reports the escaped validation crash).
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'validation-service-down');
    });

    // ...and the parent scope must not keep the committed write (19-01): the
    // ghost write would leave `address.street = "Updated"` behind a failed
    // confirm; the rollback restores the pre-commit value.
    await waitFor(() => {
      expect(screen.getByTestId('street-probe').textContent).toBe('street=Original');
    });
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

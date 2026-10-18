import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env as baseEnv } from '../test-support.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

// FM-017: a failing surface submit hook used to be console.warn-only — no
// user-visible or monitor channel. The failure must surface via env.notify.

describe('surface submit hook failure reporting (FM-017)', () => {
  it('notifies through env.notify when the surface submit:success hook fails', async () => {
    cleanup();
    const notify = vi.fn();

    const testEnv = {
      ...baseEnv,
      notify,
      fetcher: async (api: { url?: string }) => {
        if (typeof api.url === 'string' && api.url.includes('/hook-fail')) {
          return { status: 1, msg: 'hook side-effect exploded' };
        }
        return { status: 0, data: { id: '1' } };
      },
    };

    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://fm17-surface-hook-failure"
        env={testEnv as unknown as typeof baseEnv}
        formulaCompiler={createFormulaCompiler()}
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'button',
                id: 'edit',
                label: 'Edit',
                onClick: {
                  action: 'openDialog',
                  args: {
                    title: 'Edit',
                    // dialog-level onSubmitSuccess = the surface hook (owner ctx)
                    onSubmitSuccess: [
                      {
                        action: 'ajax',
                        args: { url: '/hook-fail', method: 'post' },
                      },
                    ],
                    body: {
                      type: 'form',
                      id: 'fm17-form',
                      submitScope: 'surface',
                      submitAction: {
                        action: 'ajax',
                        args: { url: '/__update', method: 'post' },
                      },
                      body: [{ type: 'input-text', name: 'nickName', label: 'Nick' }],
                      actions: [
                        {
                          type: 'button',
                          id: 'submit',
                          label: 'OK',
                          variant: 'primary',
                          onClick: { action: 'submitForm' },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          } as BaseSchema
        }
        data={{ nickName: '' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const ok = await screen.findByRole('button', { name: 'OK' });
    fireEvent.click(ok);

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', expect.stringContaining('hook'));
    });
  });
});

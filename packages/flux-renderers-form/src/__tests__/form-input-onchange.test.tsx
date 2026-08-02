import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env as baseEnv } from '../test-support.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

type SchemaInput = BaseSchema | BaseSchema[];

describe('form input onChange', () => {
  it('fireEvent.change updates form store and submit sends typed value', async () => {
    cleanup();

    let savedData: Record<string, unknown> | undefined;

    const testEnv = {
      ...baseEnv,
      fetcher: vi.fn(async (api: { url: string; data?: unknown }) => {
        if (api.url.includes('__save')) {
          savedData = api.data as Record<string, unknown>;
          return { ok: true, data: { id: '1' } };
        }
        return { ok: true, data: {} };
      }),
    } as unknown as typeof baseEnv;

    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form-input"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              submitAction: {
                action: 'ajax',
                args: { url: '/r/Test__save', includeScope: '*' },
              },
              body: [
                { type: 'input-text', name: 'name', label: 'Name' },
              ],
              actions: [
                {
                  type: 'button',
                  label: 'Save',
                  level: 'primary',
                  onClick: { action: 'submitForm' },
                },
              ],
            },
          ],
        } as SchemaInput}
        env={testEnv}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // Type in the input
    const nameInput = await screen.findByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'HelloWorld' } });

    // DOM should reflect the change
    expect((nameInput as HTMLInputElement).value).toBe('HelloWorld');

    // Submit
    fireEvent.click(screen.getByText('Save'));

    // Wait for save
    await waitFor(() => expect(savedData).toBeDefined(), { timeout: 5000 });

    // The typed value must be in the request
    expect(savedData?.name).toBe('HelloWorld');
  });
});

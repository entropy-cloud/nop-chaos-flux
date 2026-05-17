import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import {
  env,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
} from './form-test-support.js';

describe('formRendererDefinitions - form.data expression lifecycle', () => {
  it('evaluates form.data expressions once into initial form values', async () => {
    cleanup();
    const formulaCompiler = createFormulaCompiler();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/data-expression-initial"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'expr-init-form',
              data: {
                username: '${currentUser.name}',
                roleLabel: 'Role: ${currentUser.role}',
              },
              body: [
                {
                  type: 'form-state-probe',
                  name: 'username',
                },
                {
                  type: 'scope-state-probe',
                  name: 'roleLabel',
                },
                {
                  type: 'text',
                  text: '${username} / ${roleLabel}',
                },
              ],
            },
          ],
        }}
        data={{ currentUser: { name: 'Alice', role: 'admin' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-state:username').textContent).toBe('"Alice"');
      expect(screen.getByTestId('scope-state:roleLabel').textContent).toBe('"Role: admin"');
      expect(screen.getByText('Alice / Role: admin')).toBeTruthy();
    });
  });

  it('does not rebind form.data expressions after mount when parent data changes', async () => {
    cleanup();
    const formulaCompiler = createFormulaCompiler();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      formStateProbeRenderer,
    ]);

    const schema = {
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'expr-non-rebind-form',
          data: {
            username: '${currentUser.name}',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
            {
              type: 'form-state-probe',
              name: 'username',
            },
            {
              type: 'text',
              text: '${username}',
            },
          ],
        },
      ],
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://form/data-expression-non-rebind"
        schema={schema}
        data={{ currentUser: { name: 'Alice' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('Alice');
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Edited' } });

    await waitFor(() => {
      expect(screen.getByTestId('form-state:username').textContent).toBe('"Edited"');
      expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('Edited');
      expect(screen.getByText('Edited')).toBeTruthy();
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://form/data-expression-non-rebind"
        schema={schema}
        data={{ currentUser: { name: 'Bob' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('Edited');
      expect(screen.getByTestId('form-state:username').textContent).toBe('"Edited"');
    });
  });
});

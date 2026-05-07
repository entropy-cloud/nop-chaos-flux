import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ActionResult } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  allFormDefs,
  env,
  formulaCompiler,
  submitButtonRenderer,
  makeCapturingFetcher,
} from './__tests__/object-field-test-support.js';

describe('object-field transform actions', () => {
  it('runs transformInAction before publishing child scope values', async () => {
    cleanup();
    const calls: Array<Record<string, unknown> | undefined> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (_method: string, payload: Record<string, unknown> | undefined) => {
            calls.push(payload);
            return {
              ok: true,
              data: {
                firstName: 'Adapted',
                lastName: 'User',
              },
            };
          },
        }),
      })),
    };
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#6"
        schema={{
          type: 'form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith',
            },
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformInAction: { action: 'objectLib:toDraft' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' },
              ],
            },
          ],
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Adapted'),
    );
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('User');
    expect(calls[0]).toEqual({
      value: { firstName: 'Alice', lastName: 'Smith' },
      name: 'profile',
      readOnly: false,
    });
  });

  it('runs transformOutAction before writing child edits back to the parent form', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const calls: Array<Record<string, unknown> | undefined> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => {
            calls.push(payload);
            if (method === 'toPersisted') {
              const value = payload?.value as Record<string, unknown> | undefined;
              return {
                ok: true,
                data: {
                  firstName: String(value?.firstName ?? '').toUpperCase(),
                  lastName: value?.lastName ?? '',
                },
              };
            }

            return { ok: true };
          },
        }),
      })),
    };

    const SchemaRenderer = createSchemaRenderer([...allFormDefs, submitButtonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#7"
        schema={{
          type: 'form',
          id: 'obj-transform-out-form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith',
            },
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformOutAction: { action: 'objectLib:toPersisted' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' },
              ],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-transform-out-form' },
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

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(1));
    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'BOB', lastName: 'Smith' },
    });
    expect(calls[0]).toEqual({
      value: { firstName: 'Bob', lastName: 'Smith' },
      originalValue: { firstName: 'Alice', lastName: 'Smith' },
      name: 'profile',
      readOnly: false,
    });
  });

  it('suppresses stale async transformOutAction results', async () => {
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
        schemaUrl="test://flux-renderers-form-advanced/composite-field/object-field.test.tsx#8"
        schema={{
          type: 'form',
          id: 'obj-transform-out-race-form',
          data: {
            profile: {
              firstName: 'Alice',
              lastName: 'Smith',
            },
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              'xui:imports': [{ from: 'object-lib', as: 'objectLib' }],
              transformOutAction: { action: 'objectLib:toPersisted' },
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name' },
                { type: 'input-text', name: 'lastName', label: 'Last Name' },
              ],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'obj-transform-out-race-form' },
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

    const input = await screen.findByLabelText('First Name');
    fireEvent.change(input, { target: { value: 'Bob' } });
    fireEvent.change(input, { target: { value: 'Carol' } });

    await waitFor(() => {
      expect(resolvers).toHaveLength(2);
    });
    resolvers[1]({ ok: true, data: { firstName: 'CAROL', lastName: 'Smith' } });
    resolvers[0]({ ok: true, data: { firstName: 'BOB', lastName: 'Smith' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBe(1));
    expect(submitValues[0]).toMatchObject({
      profile: { firstName: 'CAROL', lastName: 'Smith' },
    });
  });
});

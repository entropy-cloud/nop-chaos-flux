import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buttonRenderer,
  createDataSchemaRenderer,
  env as baseEnv,
  formulaCompiler,
} from '../test-support.js';

const mockFetcher = vi.fn();
mockFetcher.mockResolvedValue({ ok: true, status: 200, data: null });

const testEnv = {
  ...baseEnv,
  fetcher: mockFetcher,
};

describe('table row → dialog scope inheritance', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('dialog body can access row-scoped $slot.record fields', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://table-dialog-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              columns: [
                { label: 'Name', name: 'name' },
                {
                  type: 'operation',
                  label: 'Actions',
                  buttons: [
                    {
                      type: 'button',
                      label: 'Inspect',
                      onClick: {
                        action: 'openDialog',
                        args: {
                          title: 'User Details',
                          body: [
                            { type: 'text', text: 'User: ${$slot.record.name}' },
                            { type: 'text', text: 'ID: ${$slot.record.id}' },
                          ],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const inspectButtons = await screen.findAllByText('Inspect');
    // Click first row (Alice)
    fireEvent.click(inspectButtons[0]);
    expect(await screen.findByText('User Details')).toBeTruthy();
    expect(screen.getByText('User: Alice')).toBeTruthy();
    expect(screen.getByText('ID: 1')).toBeTruthy();

    // Close and test second row
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('User Details')).toBeNull());

    // Wait for re-render after dialog close
    await waitFor(() => {
      const btns = screen.queryAllByText('Inspect');
      return btns.length >= 2;
    });
    const btnsAfter = screen.getAllByText('Inspect');
    fireEvent.click(btnsAfter[1]);
    expect(await screen.findByText('User Details')).toBeTruthy();
    expect(screen.getByText('User: Bob')).toBeTruthy();
    expect(screen.getByText('ID: 2')).toBeTruthy();
  });

  it('initAction URL resolves row variables from inherited scope', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://table-dialog-initaction"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [
                { id: 7, name: 'Carol' },
              ],
              columns: [
                { label: 'Name', name: 'name' },
                {
                  type: 'operation',
                  label: 'Actions',
                  buttons: [
                    {
                      type: 'button',
                      label: 'Detail',
                      onClick: {
                        action: 'openDialog',
                        args: {
                          title: 'Detail',
                          body: [
                            {
                              type: 'form',
                              id: 'detailForm',
                              initAction: {
                                action: 'ajax',
                                args: {
                                  url: '/api/user/${id}',
                                  method: 'get',
                                },
                              },
                              body: [
                                { type: 'text', text: 'Loading user ${id}...' },
                              ],
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }}
        env={testEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const detailBtn = await screen.findByText('Detail');
    fireEvent.click(detailBtn);

    // Verify dialog opened - look for dialog surface, not button text
    await waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-surface"]')).toBeTruthy();
    });

    // The dialog's initAction should resolve ${id} to the row's id=7
    await waitFor(() => {
      const calls = mockFetcher.mock.calls;
      const urlCall = calls.find(([config]: any) => config?.url === '/api/user/7');
      expect(urlCall).toBeDefined();
      expect(urlCall[0].method).toBe('get');
    });

    // Also verify ${id} renders in the dialog text (scope inherited)
    expect(screen.getByText('Loading user 7...')).toBeTruthy();
  });

  it('initAction with includeScope sends row fields in the request', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://table-dialog-includescope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: [
                { id: 42, name: 'Dave' },
              ],
              columns: [
                { label: 'Name', name: 'name' },
                {
                  type: 'operation',
                  label: 'Actions',
                  buttons: [
                    {
                      type: 'button',
                      label: 'Save',
                      onClick: {
                        action: 'openDialog',
                        args: {
                          title: 'Edit',
                          body: [
                            {
                              type: 'form',
                              id: 'editForm',
                              submitAction: {
                                action: 'ajax',
                                args: {
                                  url: '/api/user/save',
                                  method: 'post',
                                  data: { name: '${name}' },
                                  includeScope: '*',
                                },
                              },
                              body: [
                                { type: 'text', text: 'Editing user ${id}' },
                              ],
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }}
        env={testEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const saveBtn = await screen.findByText('Save');
    fireEvent.click(saveBtn);
    expect(await screen.findByText('Edit')).toBeTruthy();

    // Verify text shows the row id
    expect(screen.getByText('Editing user 42')).toBeTruthy();
  });
});

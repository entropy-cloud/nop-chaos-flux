// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { createNopDebugger } from './index.js';

const SchemaRenderer = createSchemaRenderer();

const env = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

const richEnv = {
  fetcher: async <T,>(api?: { url?: string }) => {
    if (api?.url === '/api/search') {
      return { ok: true, status: 200, data: { results: [] } as T };
    }
    if (api?.url === '/api/validate-username') {
      return { ok: true, status: 200, data: { valid: true } as T };
    }
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

afterEach(() => {
  cleanup();
});

function renderWithDebugger(schema: SchemaInput) {
  const registry = createDefaultRegistry();
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
  registerDataRenderers(registry);

  const ctrl = createNopDebugger({ id: 'inspect-form-progressive', enabled: true });

  render(
      <SchemaRenderer
        schemaUrl="test://progressive-form.json"
        schema={schema}
        env={ctrl.decorateEnv(env)}
        registry={registry}
      formulaCompiler={createFormulaCompiler()}
      plugins={[ctrl.plugin]}
      onRuntimeChange={(runtime) => ctrl.setRuntime(runtime)}
      onComponentRegistryChange={(componentRegistry) => ctrl.setComponentRegistry(componentRegistry)}
      onActionScopeChange={(actionScope) => ctrl.setActionScope(actionScope)}
      onActionError={ctrl.onActionError}
    />,
  );

  return ctrl;
}

function renderWithRichDebugger(schema: SchemaInput) {
  const registry = createDefaultRegistry();
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
  registerDataRenderers(registry);

  const ctrl = createNopDebugger({ id: 'inspect-form-progressive-rich', enabled: true });

  render(
    <SchemaRenderer
      schemaUrl="test://progressive-form-rich.json"
      schema={schema}
      env={ctrl.decorateEnv(richEnv)}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      plugins={[ctrl.plugin]}
      onRuntimeChange={(runtime) => ctrl.setRuntime(runtime)}
      onComponentRegistryChange={(componentRegistry) => ctrl.setComponentRegistry(componentRegistry)}
      onActionScopeChange={(actionScope) => ctrl.setActionScope(actionScope)}
      onActionError={ctrl.onActionError}
    />,
  );

  return ctrl;
}

function readFieldCid(labelText: string) {
  const labels = Array.from(document.querySelectorAll('[data-slot="field-label"]'));
  const label = labels.find((node) => node.textContent?.includes(labelText));
  return Number(label?.closest('[data-cid]')?.getAttribute('data-cid'));
}

describe('controller inspector — progressive form scenarios', () => {
  it('renders a realistic form shell with wrapped select field cids', async () => {
    const ctrl = renderWithDebugger({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'user-form',
          data: {
            username: '',
            role: 'viewer',
            adminCode: '',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' },
              ],
            },
            {
              type: 'input-password',
              name: 'adminCode',
              label: 'Admin Code',
              visible: '${role === "admin"}',
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByLabelText('Role')).toBeTruthy());

    const usernameCid = readFieldCid('Username');
    const roleCid = readFieldCid('Role');

    expect(usernameCid).toBeGreaterThan(0);
    expect(roleCid).toBeGreaterThan(0);

    await waitFor(() => {
      expect(ctrl.inspectByCid(usernameCid)).toMatchObject({ cid: usernameCid, mounted: true });
      expect(ctrl.inspectByCid(roleCid)).toMatchObject({ cid: roleCid, mounted: true });
    });
  });

  it('keeps visible conditional password fields inspectable when the condition is already satisfied', async () => {
    const ctrl = renderWithDebugger({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'user-form',
          data: {
            username: '',
            role: 'admin',
            adminCode: '',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' },
              ],
            },
            {
              type: 'input-password',
              name: 'adminCode',
              label: 'Admin Code',
              visible: '${role === "admin"}',
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByLabelText('Admin Code')).toBeTruthy());

    const usernameCid = readFieldCid('Username');
    const adminCodeCid = readFieldCid('Admin Code');

    expect(usernameCid).toBeGreaterThan(0);
    expect(adminCodeCid).toBeGreaterThan(0);

    await waitFor(() => {
      expect(ctrl.inspectByCid(usernameCid)).toMatchObject({ cid: usernameCid, mounted: true });
      expect(ctrl.inspectByCid(adminCodeCid)).toMatchObject({ cid: adminCodeCid, mounted: true });
    });
  });

  it('keeps user-form field cids inspectable when another form is rendered earlier on the page', async () => {
    const ctrl = renderWithDebugger({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'search-form',
          data: {
            query: '',
          },
          body: [
            {
              type: 'input-text',
              name: 'query',
              label: 'Search Users',
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Search Directory',
              disabled: '${!query}',
            },
          ],
        },
        {
          type: 'form',
          id: 'user-form',
          data: {
            username: '',
            role: 'admin',
            adminCode: '',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' },
              ],
            },
            {
              type: 'input-password',
              name: 'adminCode',
              label: 'Admin Code',
              visible: '${role === "admin"}',
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByLabelText('Admin Code')).toBeTruthy());

    const usernameCid = readFieldCid('Username');
    const adminCodeCid = readFieldCid('Admin Code');
    const searchUsersCid = readFieldCid('Search Users');

    expect(searchUsersCid).toBeGreaterThan(0);
    expect(usernameCid).toBeGreaterThan(0);
    expect(adminCodeCid).toBeGreaterThan(0);

    await waitFor(() => {
      expect(ctrl.inspectByCid(searchUsersCid)).toMatchObject({ cid: searchUsersCid, mounted: true });
      expect(ctrl.inspectByCid(usernameCid)).toMatchObject({ cid: usernameCid, mounted: true });
      expect(ctrl.inspectByCid(adminCodeCid)).toMatchObject({ cid: adminCodeCid, mounted: true });
    });
  });

  it('keeps conditional field cids inspectable in a denser form close to flux-basic shape', async () => {
    const ctrl = renderWithDebugger({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'search-form',
          data: { query: '' },
          body: [
            {
              type: 'input-text',
              name: 'query',
              label: 'Search Users',
              placeholder: 'Type a username or role',
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Search Directory',
              disabled: '${!query}',
            },
          ],
        },
        {
          type: 'form',
          id: 'user-form',
          validateOn: 'blur',
          showErrorOn: ['touched', 'submit'],
          data: {
            username: '',
            email: '',
            role: 'admin',
            adminCode: '',
            notes: '',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              placeholder: 'Enter username',
              required: true,
              minLength: 3,
            },
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              placeholder: 'Enter email',
              required: true,
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Editor', value: 'editor' },
                { label: 'Admin', value: 'admin' },
              ],
            },
            {
              type: 'input-password',
              name: 'adminCode',
              label: 'Admin Code',
              placeholder: 'Only required for admin submissions',
              visible: '${role === "admin"}',
              minLength: 4,
            },
            {
              type: 'textarea',
              name: 'notes',
              label: 'Reviewer Notes',
              placeholder: 'Add internal notes for the submission review',
              rows: 4,
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByLabelText('Admin Code')).toBeTruthy());

    const usernameCid = readFieldCid('Username');
    const emailCid = readFieldCid('Email');
    const roleCid = readFieldCid('Role');
    const adminCodeCid = readFieldCid('Admin Code');
    const notesCid = readFieldCid('Reviewer Notes');

    expect(usernameCid).toBeGreaterThan(0);
    expect(emailCid).toBeGreaterThan(0);
    expect(roleCid).toBeGreaterThan(0);
    expect(adminCodeCid).toBeGreaterThan(0);
    expect(notesCid).toBeGreaterThan(0);

    await waitFor(() => {
      expect(ctrl.inspectByCid(usernameCid)).toMatchObject({ cid: usernameCid, mounted: true });
      expect(ctrl.inspectByCid(emailCid)).toMatchObject({ cid: emailCid, mounted: true });
      expect(ctrl.inspectByCid(roleCid)).toMatchObject({ cid: roleCid, mounted: true });
      expect(ctrl.inspectByCid(adminCodeCid)).toMatchObject({ cid: adminCodeCid, mounted: true });
      expect(ctrl.inspectByCid(notesCid)).toMatchObject({ cid: notesCid, mounted: true });
    });
  });

  it('keeps conditional field cids inspectable with debugger env hooks active', async () => {
    const ctrl = renderWithRichDebugger({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'search-form',
          data: { query: '' },
          body: [
            {
              type: 'input-text',
              name: 'query',
              label: 'Search Users',
              placeholder: 'Type a username or role',
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Search Directory',
              disabled: '${!query}',
              onClick: {
                action: 'ajax',
                args: {
                  method: 'post',
                  url: '/api/search',
                },
              },
            },
          ],
        },
        {
          type: 'form',
          id: 'user-form',
          validateOn: 'blur',
          showErrorOn: ['touched', 'submit'],
          data: {
            username: '',
            email: '',
            role: 'admin',
            adminCode: '',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              validateOn: ['blur', 'change', 'submit'],
              validate: {
                api: {
                  method: 'post',
                  url: '/api/validate-username',
                },
              },
            },
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' },
              ],
            },
            {
              type: 'input-password',
              name: 'adminCode',
              label: 'Admin Code',
              visible: '${role === "admin"}',
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByLabelText('Admin Code')).toBeTruthy());

    const usernameCid = readFieldCid('Username');
    const adminCodeCid = readFieldCid('Admin Code');

    await waitFor(() => {
      expect(ctrl.inspectByCid(usernameCid)).toMatchObject({ cid: usernameCid, mounted: true });
      expect(ctrl.inspectByCid(adminCodeCid)).toMatchObject({ cid: adminCodeCid, mounted: true });
    });
  });
});

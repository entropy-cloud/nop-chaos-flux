// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { createNopDebugger } from './index.js';

const SchemaRenderer = createSchemaRenderer();

const env = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

describe('controller inspector — form integration', () => {
  it('inspects wrapped form fields through the mounted cid bridge', async () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);

    const ctrl = createNopDebugger({ id: 'inspect-form-integration', enabled: true });
    const formulaCompiler = createFormulaCompiler();

    render(
      <SchemaRenderer
        schemaUrl="test://form.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              data: {
                role: 'admin',
                username: 'alice',
              },
              body: [
                {
                  type: 'input-text',
                  name: 'username',
                  label: 'Username',
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
        }}
        env={ctrl.decorateEnv(env)}
        registry={registry}
        formulaCompiler={formulaCompiler}
        plugins={[ctrl.plugin]}
        onRuntimeChange={(runtime) => ctrl.setRuntime(runtime)}
        onComponentRegistryChange={(componentRegistry) => ctrl.setComponentRegistry(componentRegistry)}
        onActionScopeChange={(actionScope) => ctrl.setActionScope(actionScope)}
        onActionError={ctrl.onActionError}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('.nop-field[data-cid]')).toBeTruthy();
    });

    const readFieldCid = (labelText: string) => {
      const labels = Array.from(document.querySelectorAll('[data-slot="field-label"]'));
      const label = labels.find((node) => node.textContent?.includes(labelText));
      return Number(label?.closest('[data-cid]')?.getAttribute('data-cid'));
    };

    const usernameCid = readFieldCid('Username');
    const adminCodeCid = readFieldCid('Admin Code');

    expect(usernameCid).toBeGreaterThan(0);
    expect(adminCodeCid).toBeGreaterThan(0);

    await waitFor(() => {
      expect(ctrl.inspectByCid(usernameCid)).toMatchObject({
        cid: usernameCid,
        mounted: true,
      });
      expect(ctrl.inspectByCid(adminCodeCid)).toMatchObject({
        cid: adminCodeCid,
        mounted: true,
      });
    });
  });
});

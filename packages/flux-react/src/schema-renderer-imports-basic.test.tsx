import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from './index';
import { buttonRenderer, dispatchProbeRenderer, env, pageRenderer, scopedHostRenderer, sharedFormulaCompiler, textRenderer } from './test-support';

describe('createSchemaRenderer import basics', () => {
  it('loads xui imports and dispatches imported namespace actions', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${method}:${String(payload?.id ?? '')}`
          })
        })
      }))
    };
    const SchemaRenderer = createSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'button',
          label: 'Run import action',
          'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
          onClick: { action: 'demo:open', args: { id: 'record-1' } }
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await screen.findByText('Run import action');
    fireEvent.click(screen.getByText('Run import action'));

    await waitFor(() => {
      expect(importLoader.load).toHaveBeenCalledWith({ from: 'demo-lib', as: 'demo' });
    });
  });

  it('projects imported aliases into expressions as $alias bindings', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
          formatName(first: string, last: string) {
            return `${first} ${last}`;
          }
        })
      }))
    };
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'text',
          'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
          text: 'Imported ${$demo.formatName(user.firstName, user.lastName)}'
        } as any}
        data={{ user: { firstName: 'Ada', lastName: 'Lovelace' } }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    expect(await screen.findByText('Imported Ada Lovelace')).toBeTruthy();
  });

  it('dedupes module loads across import-owner scopes while keeping registrations lexical', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, scopedHostRenderer, dispatchProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            { type: 'dispatch-probe', label: 'Run local import', resultKey: 'local-import-result', 'xui:imports': [{ from: 'demo-lib', as: 'demo' }], runAction: { action: 'demo:ping', args: { value: 'local' } } },
            { type: 'scoped-host', 'xui:imports': [{ from: 'demo-lib', as: 'demo' }], body: [{ type: 'dispatch-probe', label: 'Run child import', resultKey: 'child-import-result', runAction: { action: 'demo:ping', args: { value: 'child' } } }] },
            { type: 'dispatch-probe', label: 'Run sibling import', resultKey: 'sibling-import-result', runAction: { action: 'demo:ping', args: { value: 'sibling' } } }
          ]
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(importLoader.load).toHaveBeenCalledTimes(1);
    });

    await screen.findByText('Run local import');

    fireEvent.click(screen.getByText('Run local import'));
    fireEvent.click(screen.getByText('Run child import'));
    fireEvent.click(screen.getByText('Run sibling import'));

    await waitFor(() => {
      expect(screen.getByTestId('local-import-result').textContent).toBe('demo-lib:ping:local');
      expect(screen.getByTestId('child-import-result').textContent).toBe('demo-lib:ping:child');
      expect(screen.getByTestId('sibling-import-result').textContent).toBe('demo-lib:ping:sibling');
    });
  });

  it('keeps node-owned imports local to the declaring node boundary', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, dispatchProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'dispatch-probe',
              label: 'Run local import',
              resultKey: 'local-import-result',
              'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
              runAction: { action: 'demo:ping', args: { value: 'local' } }
            },
            {
              type: 'dispatch-probe',
              label: 'Run sibling import',
              resultKey: 'sibling-import-result',
              runAction: { action: 'demo:ping', args: { value: 'sibling' } }
            }
          ]
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await screen.findByText('Run local import');
    fireEvent.click(screen.getByText('Run local import'));
    fireEvent.click(screen.getByText('Run sibling import'));

    await waitFor(() => {
      expect(screen.getByTestId('local-import-result').textContent).toBe('demo-lib:ping:local');
      expect(screen.getByTestId('sibling-import-result').textContent).toBe('demo-lib:ping:sibling');
    });
  });
});

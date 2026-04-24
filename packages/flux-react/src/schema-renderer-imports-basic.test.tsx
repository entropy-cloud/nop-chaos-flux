import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createModuleCache } from '@nop-chaos/flux-runtime';
import { createSchemaRenderer } from './index';
import { buttonRenderer, dispatchProbeRenderer, env, pageRenderer, scopedHostRenderer, sharedFormulaCompiler, textRenderer } from './test-support';

describe('createSchemaRenderer import basics', () => {
  it('does not invoke import preload when the schema has no xui imports', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true })
        })
      }))
    };
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'text', text: 'No imports' }}
        schemaUrl="https://app.local/schema/no-imports.json"
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    expect(await screen.findByText('No imports')).toBeTruthy();
    expect(importLoader.load).not.toHaveBeenCalled();
  });

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
        schemaUrl="https://app.local/schema/button.json"
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
          invoke: async () => ({ ok: true })
        }),
        createExpressionHelpers: () => ({
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
        schemaUrl="https://app.local/schema/text.json"
        data={{ user: { firstName: 'Ada', lastName: 'Lovelace' } }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    expect(await screen.findByText('Imported Ada Lovelace')).toBeTruthy();
  });

  it('dedupes module loads across import-owner scopes while keeping sibling registrations lexical', async () => {
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
        schemaUrl="https://app.local/schema/page.json"
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
      expect(screen.getByTestId('sibling-import-result').textContent).toBe('Error: Unsupported action: demo:ping');
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
        schemaUrl="https://app.local/schema/page.json"
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await screen.findByText('Run local import');
    fireEvent.click(screen.getByText('Run local import'));
    fireEvent.click(screen.getByText('Run sibling import'));

    await waitFor(() => {
      expect(screen.getByTestId('local-import-result').textContent).toBe('demo-lib:ping:local');
      expect(screen.getByTestId('sibling-import-result').textContent).toBe('Error: Unsupported action: demo:ping');
    });
  });

  it('dedupes relative imports across schema renderers with shared module cache', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true })
        }),
        createExpressionHelpers: () => ({
          formatName(first: string, last: string) {
            return `${first} ${last}`;
          }
        })
      }))
    };
    const resolveImportUrl = vi.fn((schemaUrl: string, from: string) => new URL(from, schemaUrl).toString());
    const moduleCache = createModuleCache();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    render(
      <div>
        <SchemaRenderer
          schema={{ type: 'text', 'xui:imports': [{ from: './shared-lib.js', as: 'demo' }], text: '${$demo.formatName("Ada", "Lovelace")}' } as any}
          schemaUrl="https://app.local/routes/a/page.json"
          moduleCache={moduleCache}
          env={{ ...env, importLoader, resolveImportUrl }}
          formulaCompiler={sharedFormulaCompiler}
        />
        <SchemaRenderer
          schema={{ type: 'text', 'xui:imports': [{ from: '../a/shared-lib.js', as: 'demo' }], text: '${$demo.formatName("Grace", "Hopper")}' } as any}
          schemaUrl="https://app.local/routes/b/page.json"
          moduleCache={moduleCache}
          env={{ ...env, importLoader, resolveImportUrl }}
          formulaCompiler={sharedFormulaCompiler}
        />
      </div>
    );

    await waitFor(() => {
      expect(screen.getAllByText((_, element) => element?.textContent === 'Ada Lovelace').length).toBeGreaterThan(0);
      expect(screen.getAllByText((_, element) => element?.textContent === 'Grace Hopper').length).toBeGreaterThan(0);
    });
    expect(importLoader.load).toHaveBeenCalledTimes(1);
  });

  it('passes resolved import URLs to the loader', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true })
        }),
        createExpressionHelpers: () => ({
          formatName(first: string, last: string) {
            return `${first} ${last}`;
          }
        })
      }))
    };
    const resolveImportUrl = vi.fn((schemaUrl: string, from: string) => `resolved:${schemaUrl}:${from}`);
    const SchemaRenderer = createSchemaRenderer([textRenderer]);

    render(
      <SchemaRenderer
        schema={{ type: 'text', 'xui:imports': [{ from: './demo-lib.js', as: 'demo' }], text: '${$demo.formatName("Ada", "Lovelace")}' } as any}
        schemaUrl="https://app.local/schema/page.json"
        env={{ ...env, importLoader, resolveImportUrl }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText((_, element) => element?.textContent === 'Ada Lovelace').length).toBeGreaterThan(0);
    });
    expect(resolveImportUrl).toHaveBeenCalledWith('https://app.local/schema/page.json', './demo-lib.js', undefined);
    expect(importLoader.load).toHaveBeenCalledWith({ from: 'resolved:https://app.local/schema/page.json:./demo-lib.js', as: 'demo' });
  });

  it('keeps nested imported helpers shadowed by the nearest import frame', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true })
        }),
        createExpressionHelpers: () => ({
          label() {
            return spec.from;
          }
        })
      }))
    };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, scopedHostRenderer, textRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'scoped-host',
              'xui:imports': [{ from: 'outer-lib', as: 'demo' }],
              body: [
                { type: 'text', text: 'Outer ${$demo.label()}' },
                {
                  type: 'scoped-host',
                  'xui:imports': [{ from: 'inner-lib', as: 'demo' }],
                  body: [{ type: 'text', text: 'Inner ${$demo.label()}' }]
                }
              ]
            }
          ]
        } as any}
        schemaUrl="https://app.local/schema/page.json"
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Outer outer-lib')).toBeTruthy();
      expect(screen.getByText('Inner inner-lib')).toBeTruthy();
    });
  });
});

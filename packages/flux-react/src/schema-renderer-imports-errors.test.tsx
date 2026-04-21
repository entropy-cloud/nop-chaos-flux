import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from './index';
import { buttonRenderer, dispatchProbeRenderer, env, pageRenderer, sharedFormulaCompiler } from './test-support';

describe('createSchemaRenderer import failures and retries', () => {
  it('reports preload failures through env notifications before child render', async () => {
    let resolveModule:
      | ((module: { createNamespace: () => { kind: 'import'; invoke: () => Promise<{ ok: true }> } }) => void)
      | undefined;
    const importLoader = {
      load: vi.fn((spec: { from: string; as: string }) => {
        if (spec.as === 'slow') {
          return new Promise<{ createNamespace: () => { kind: 'import'; invoke: () => Promise<{ ok: true }> } }>((resolve) => {
            resolveModule = resolve;
          });
        }
        return Promise.reject(new Error('loader exploded'));
      })
    };
    const notify = vi.fn();
    const onError = vi.fn();
    const SchemaRenderer = createSchemaRenderer([pageRenderer, dispatchProbeRenderer]);

    render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{
          type: 'page',
          body: [
            { type: 'dispatch-probe', label: 'Run loading import', resultKey: 'loading-import-result', 'xui:imports': [{ from: 'slow-lib', as: 'slow' }], runAction: { action: 'slow:ping' } },
            { type: 'dispatch-probe', label: 'Run failed import', resultKey: 'failed-import-result', 'xui:imports': [{ from: 'broken-lib', as: 'broken' }], runAction: { action: 'broken:ping' } }
          ]
        }}
        env={{ ...env, notify, monitor: { onError }, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'Imported namespaces failed for $.body[1]: loader exploded');
    });

    resolveModule?.({
      createNamespace: () => ({ kind: 'import' as const, invoke: async () => ({ ok: true }) })
    });
  });

  it('warns in development when imported namespace setup fails during render', async () => {
    const importLoader = {
      load: vi.fn(async () => {
        throw new Error('broken during render');
      })
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{
          type: 'button',
          label: 'Broken import button',
          'xui:imports': [{ from: 'broken-lib', as: 'broken' }],
          onClick: { action: 'broken:open' }
        }}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  it('retries failed imports after env importLoader updates without recreating the tree', async () => {
    let shouldFail = true;
    const notify = vi.fn();
    const SchemaRenderer = createSchemaRenderer([pageRenderer, dispatchProbeRenderer]);

    function Host() {
      const [tick, setTick] = React.useState(0);
      const importLoader = React.useMemo(
        () => ({
          load: vi.fn(async (spec: { from: string; as: string }) => {
            if (shouldFail) {
              throw new Error(`loader exploded ${tick}`);
            }

            return {
              createNamespace: () => ({
                kind: 'import' as const,
                invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
                  ok: true,
                  data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
                })
              })
            };
          })
        }),
        [tick]
      );

      return (
        <div>
          <button type="button" onClick={() => setTick((current) => current + 1)}>
            Refresh env {tick}
          </button>
          <SchemaRenderer schemaUrl="test://schema.json" schema={{
              type: 'page',
              body: [
                { type: 'dispatch-probe', label: 'Run retried import', resultKey: 'retry-import-result', 'xui:imports': [{ from: 'retry-lib', as: 'retry' }], runAction: { action: 'retry:ping', args: { value: 'live' } } }
              ]
            }}
            env={{ ...env, notify, importLoader }}
            formulaCompiler={sharedFormulaCompiler}
          />
        </div>
      );
    }

    render(<Host />);

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'Imported namespaces failed for $.body[0]: loader exploded 0');
    });

    shouldFail = false;
    fireEvent.click(screen.getByText('Refresh env 0'));
    await screen.findByText('Run retried import');
    fireEvent.click(screen.getByText('Run retried import'));

    await waitFor(() => {
      expect(screen.getByTestId('retry-import-result').textContent).toBe('retry-lib:ping:live');
    });
  });
});

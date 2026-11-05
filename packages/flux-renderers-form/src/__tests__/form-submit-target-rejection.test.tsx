import React, { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema, RendererComponentProps, RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaRenderer, useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formTestHarness } from './form-test-support.js';

afterEach(() => {
  cleanup();
});

// Plan 860 (B2): both submit-target deliveries are fire-and-forget. A target
// whose querySubmit rejects must surface through the runtime host channel
// (env.notify) instead of escaping as an unhandled promise rejection.
function RejectingTargetProbe(props: RendererComponentProps) {
  const componentRegistry = useCurrentComponentRegistry();
  const cid = props.meta.cid;
  const id = props.id;

  useEffect(() => {
    if (!componentRegistry || cid === undefined) {
      return;
    }
    return componentRegistry.register(
      {
        id,
        type: 'rejecting-target-probe',
        capabilities: {
          hasMethod: (method) => method === 'querySubmit',
          listMethods: () => ['querySubmit'],
          invoke: async () => {
            throw new Error('target rejected the query');
          },
        },
      },
      { cid },
    );
  }, [componentRegistry, cid, id]);

  return <div data-testid="rejecting-target-probe" />;
}

// vitest runs on node; this package's tsconfig carries no node types.
const nodeProcess = (globalThis as unknown as {
  process: {
    on(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
    off(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
  };
}).process;

const rejectingTargetDefinition: RegisteredRendererDefinition = {
  type: 'rejecting-target-probe',
  component: RejectingTargetProbe,
};

describe('form submit target delivery failure (plan 860 B2)', () => {
  it('reports a rejecting querySubmit through env.notify without an unhandled rejection', async () => {
    const unhandled = vi.fn();
    nodeProcess.on('unhandledRejection', unhandled);
    formTestHarness.notifyCalls.length = 0;
    try {
      const SchemaRenderer = createSchemaRenderer([
        ...basicRendererDefinitions,
        ...formRendererDefinitions,
        rejectingTargetDefinition,
      ]);
      render(
        <SchemaRenderer
          schemaUrl="test://form/submit-target-rejection"
          schema={
            {
              type: 'form',
              id: 'rejecting-target-form',
              target: 'rejecting-target',
              submitOnChange: true,
              data: { q: 'init' },
              body: [
                { type: 'input-text', name: 'q', label: 'Query' },
                { type: 'rejecting-target-probe', id: 'rejecting-target' },
              ],
            } as BaseSchema
          }
          env={env}
          formulaCompiler={createFormulaCompiler()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Query'), { target: { value: 'updated' } });
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(formTestHarness.notifyCalls).toContainEqual({
        level: 'error',
        message: 'Form submit target delivery failed',
      });
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      nodeProcess.off('unhandledRejection', unhandled);
    }
  });
});

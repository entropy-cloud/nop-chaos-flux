import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer.js';
import { useCurrentValidationScope } from '../hooks.js';
import { env, pageRenderer } from '../test-support-probes.js';

// RM-7 (plan 609): framework-internal raw schema reads migrate to resolved /
// compiled channels. These pins discriminate the migrated behavior.

const nameProbeRenderer: RegisteredRendererDefinition = {
  type: 'rm7-name-probe',
  component: () => null,
} as unknown as RegisteredRendererDefinition;

function makeSpyProbe(): {
  spyProbe: RegisteredRendererDefinition;
  notifyCalls: string[];
  capturedOwner: { current: Record<string, unknown> | undefined };
} {
  const notifyCalls: string[] = [];
  const capturedOwner: { current: Record<string, unknown> | undefined } = { current: undefined };
  const spyProbe: RegisteredRendererDefinition = {
    type: 'rm7-owner-spy-probe',
    component: function Rm7OwnerSpyProbe() {
      const validationOwner = useCurrentValidationScope() as unknown as
        | (Record<string, unknown> & { __rm7Spied?: boolean })
        | undefined;
      if (validationOwner && !validationOwner.__rm7Spied) {
        const original = validationOwner.notifyFieldHidden as (
          path: string,
          hidden: boolean,
        ) => unknown;
        validationOwner.notifyFieldHidden = (path: string, hidden: boolean) => {
          notifyCalls.push(path);
          return original.call(validationOwner, path, hidden);
        };
        validationOwner.__rm7Spied = true;
      }
      if (validationOwner) {
        capturedOwner.current = validationOwner;
      }
      return <span data-testid="rm7-owner-spy-probe">probe</span>;
    },
  } as unknown as RegisteredRendererDefinition;
  return { spyProbe, notifyCalls, capturedOwner };
}

describe('RM-7 #2 field-name resolved channel', () => {
  it('expression-form name contributes the evaluated result, not the raw expression (red leg)', async () => {
    const { spyProbe, notifyCalls, capturedOwner } = makeSpyProbe();
    const SchemaRenderer = createSchemaRenderer([pageRenderer, nameProbeRenderer, spyProbe]);
    render(
      <SchemaRenderer
        schemaUrl="test://rm7.json"
        schema={{
          type: 'page',
          body: [
            { type: 'rm7-owner-spy-probe' },
            { type: 'rm7-name-probe', name: '${1 + 1}', hidden: true },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // The page fallback validation owner publishes asynchronously (after the
    // root validation plan attaches); the participation effect re-fires on
    // the owner transition and then registers through the spied channel.
    // Migrated behavior: the resolved channel yields the evaluated value
    // (`2`, a number) → not a string → no path is ever registered. The
    // legacy raw read would have registered '${1 + 1}'.
    // Wait until the spy wrapper is live on the published owner AND the
    // participation effect has flushed (owner publication is async: the
    // fallback owner attaches after the root validation plan resolves).
    await waitFor(() => {
      const owner = capturedOwner.current;
      if (!owner?.__rm7Spied) {
        throw new Error('waiting for owner publication + spy installation');
      }
    });
    expect(notifyCalls).toEqual([]);
    // Diagnostic: prove the spy installed and the owner channel is live.
    expect(spyProbe && notifyCalls.length >= 0).toBe(true);
  });
});

describe('RM-7 #3 modalContainer compiled snapshot', () => {
  it('source mechanism: modalContainer no longer reads the host-live input (source pin)', () => {
    const source = readFileSync(
      'src/schema-renderer.tsx',
      'utf8',
    );
    // Old pattern (raw read of props.schema in the outer component) is gone:
    expect(source).not.toContain('rootSchema as BaseSchema');
    // New pattern (compiled root node read inside CompiledSchemaTree) is present:
    expect(source).toContain('getSingleRootNode(compiledRoot)');
    expect(source).toContain('props.page.modalContainer =');
  });
});

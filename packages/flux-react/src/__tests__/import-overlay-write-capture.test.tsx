import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import {
  env,
  formRenderer,
  pageRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support-probes.js';
import { containerRenderer } from './scope-and-reactivity.test-support.js';

// schema-event writer: the renderer itself wires props.events.onClick
const writeProbeRenderer = {
  type: 'write-probe',
  component: (props: { events: { onClick?: (event: unknown) => void } }) => (
    <button type="button" onClick={(event) => props.events.onClick?.(event)}>
      write-probe
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' as const }],
};

// P1-MA4.1-007 / bug 163 CHARACTERIZATION pin (defect-open), HEAD 8ae2e4ded.
// bug 163: on a container with xui:imports, every child node gets an import
// overlay scope (node-renderer.tsx createChildScope with no write
// delegation -> scope.ts update() writes the overlay ownStore only), so a
// schema-event setValue dispatched from inside the overlay never reaches the
// hosting form scope. The defect itself is OPEN; the adjudication (plan 724,
// Deferred But Adjudicated) pins the CURRENT defect-open behavior because
// the roadmap row is test-only, and the fix is owned by roadmap successor
// row R2.15. When R2.15 lands the fix, case B must be REWRITTEN to pin the
// correct write-through semantics — case B flipping red is the expected
// signal, not a regression.
describe('imports overlay write capture (bug 163 characterization, defect-open)', () => {
  const writer = {
    type: 'write-probe',
    onClick: { action: 'setValue', args: { path: 'summary.name', value: 'fired' } },
  } as const;

  async function renderCase(schema: never) {
    const importLoader = {
      load: async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true }),
        }),
      }),
    };
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      textRenderer,
      containerRenderer,
      writeProbeRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://import-overlay-write-capture.json"
        schema={schema}
        env={{ ...env, importLoader }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('write-probe')).toBeTruthy());
  }

  it('control (no xui:imports): schema-event setValue reaches the form scope', async () => {
    await renderCase({
      type: 'page',
      body: [
        {
          type: 'form',
          data: { summary: { name: 'Original' } },
          body: [
            { type: 'container', body: [writer, { type: 'text', text: '${summary.name}' }] },
          ],
        },
      ],
    } as never);

    fireEvent.click(screen.getByText('write-probe'));

    await waitFor(() => expect(screen.getByText('fired')).toBeTruthy());
  });

  it('with xui:imports overlay: the write is captured by the overlay ownStore and never reaches the form scope (defect-open pin)', async () => {
    await renderCase({
      type: 'page',
      body: [
        {
          type: 'form',
          data: { summary: { name: 'Original' } },
          body: [
            {
              type: 'container',
              'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
              body: [writer, { type: 'text', text: '${summary.name}' }],
            },
          ],
        },
      ],
    } as never);

    fireEvent.click(screen.getByText('write-probe'));
    // give any (would-be) propagation a chance to flush before pinning absence
    await waitFor(() => expect(screen.getByText('write-probe')).toBeTruthy());

    expect(screen.queryByText('fired')).toBeNull();
    expect(screen.getByText('Original')).toBeTruthy();
  });
});

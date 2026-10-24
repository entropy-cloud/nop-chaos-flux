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

// P1-MA4.1-007 / bug 163 regression guard — FIXED by R2.15 (plan 737):
// createChildScope now delegates writes to the parent scope, making
// imports overlay scopes transparent for writes. Case A pins the correct
// write-through semantics; case B pins the no-imports control.
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

  it('with xui:imports overlay: writes delegate to the hosting form scope (bug 163 fixed by R2.15)', async () => {
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

    // R2.15 fix: writes delegate through the overlay to the hosting form scope
    await waitFor(() => expect(screen.getByText('fired')).toBeTruthy());
  });
});

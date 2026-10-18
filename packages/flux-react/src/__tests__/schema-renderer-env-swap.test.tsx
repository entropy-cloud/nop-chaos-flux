import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { createSchemaRenderer, useRendererRuntime } from '../index.js';
import {
  env as baseEnv,
  pageRenderer,
  sharedFormulaCompiler,
} from '../test-support-probes.js';

// FM-028 F3: the setEnv effect no longer bumps the page refresh tick (zero
// subscribers — pure inline-env per-render cost), so env FUNCTIONS must keep
// propagating through the runtime's lazy env read. This pins that a replaced
// env object with a new notify function is honored on the same mounted tree,
// without any remount.

const notifyButtonRenderer = {
  type: 'notify-button',
  component: function NotifyButton() {
    const runtime = useRendererRuntime();
    return (
      <button
        type="button"
        onClick={() => {
          runtime.env.notify?.('info', 'ping');
        }}
      >
        notify
      </button>
    );
  },
};

describe('schema-renderer env replacement without refresh (FM-028 F3 pin)', () => {
  it('honors a swapped env notify function on rerender', async () => {
    const notifyA = vi.fn();
    const notifyB = vi.fn();

    const SchemaRenderer = createSchemaRenderer([pageRenderer, notifyButtonRenderer]);

    const schema = { type: 'page', body: [{ type: 'notify-button' }] } as const;
    const { getByRole, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://fm28-f3-env-swap"
        schema={schema}
        env={{ ...baseEnv, notify: notifyA }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await act(async () => {
      getByRole('button', { name: 'notify' }).click();
    });
    expect(notifyA).toHaveBeenCalledWith('info', 'ping');
    expect(notifyB).not.toHaveBeenCalled();

    // Swap the env object (new notify identity) — the setEnv effect must
    // propagate it to the same mounted runtime.
    rerender(
      <SchemaRenderer
        schemaUrl="test://fm28-f3-env-swap"
        schema={schema}
        env={{ ...baseEnv, notify: notifyB }}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await act(async () => {
      getByRole('button', { name: 'notify' }).click();
    });
    expect(notifyB).toHaveBeenCalledWith('info', 'ping');
  });
});

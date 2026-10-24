import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import {
  env,
  formRenderer,
  pageRenderer,
  sharedFormulaCompiler,
} from '../test-support-probes.js';

// schema events are wired by the renderer itself (props.events contract)
const gateFlipWriterRenderer = {
  type: 'gate-flip-writer',
  component: (props: { events: { onClick?: (event: unknown) => void } }) => (
    <button type="button" onClick={(event) => props.events.onClick?.(event)}>
      flip-gate
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' as const }],
};

// P1-MA4.1-005 / bug 51 regression guard: the structuralWhen handoff chain
// (compile: node-compiler.ts structuralWhen = metaProgram.when -> runtime:
// node-runtime.ts resolveNodeMeta prefers node.structuralWhen -> react:
// node-renderer-resolved.tsx `when === false` gate) must gate rendering both
// for static booleans and for reactive expressions. The bug-51 guard test
// named in docs/bugs/51 was deleted in a test reorg with no migration; these
// assertions pin the user-visible contract at both the runtime evaluation
// face (M-A mutation) and the react consumption face (M-B mutation).
function createMountRegistry() {
  const mounts = new Set<string>();
  const mountProbeRenderer = (label: string) => ({
    type: `mount-probe-${label}`,
    component: function MountProbe() {
      React.useEffect(() => {
        mounts.add(label);
      }, []);
      return <span>{`probe-${label}`}</span>;
    },
  });
  return { mounts, mountProbeRenderer };
}

describe('structuralWhen compile->runtime->react render-gating handoff', () => {
  it('does not render or mount a node with static when:false, and renders the when:true control', async () => {
    const { mounts, mountProbeRenderer } = createMountRegistry();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      mountProbeRenderer('gated'),
      mountProbeRenderer('control'),
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://structural-when.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              data: {},
              body: [
                { type: 'mount-probe-gated', when: false },
                { type: 'mount-probe-control', when: true },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('probe-control')).toBeTruthy());
    expect(screen.queryByText('probe-gated')).toBeNull();
    expect(mounts.has('control')).toBe(true);
    expect(mounts.has('gated')).toBe(false);
  });

  it('reactively re-evaluates when via expression after the scope value flips (fallback branch live)', async () => {
    const { mounts, mountProbeRenderer } = createMountRegistry();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      gateFlipWriterRenderer,
      mountProbeRenderer('reactive'),
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://structural-when-reactive.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              data: { gate: false },
              body: [
                { type: 'mount-probe-reactive', when: '${gate}' },
                {
                  type: 'gate-flip-writer',
                  onClick: { action: 'setValue', args: { path: 'gate', value: true } },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('flip-gate')).toBeTruthy());
    expect(screen.queryByText('probe-reactive')).toBeNull();
    expect(mounts.has('reactive')).toBe(false);

    fireEvent.click(screen.getByText('flip-gate'));

    await waitFor(() => expect(screen.getByText('probe-reactive')).toBeTruthy());
    expect(mounts.has('reactive')).toBe(true);
  });
});

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env, pageRenderer, sharedFormulaCompiler } from '../test-support-probes.js';

// P1-MA4.2-001 regression guard: the FRAMEWORK-level meta projection gate in
// node-renderer-resolved.tsx (`when === false || !visible || hidden` ->
// return null) must suppress render AND mount for any plain node. The 28
// test files containing visible:false all exercise component-internal
// self-reads or mock props — none renders an ordinary node against the
// framework gate, so inverting the gate left the whole suite green (audit
// Round A / A-01). This pin renders ordinary probe nodes with each control
// field and asserts absence + zero mounts.
function createMountRegistry() {
  const mounts = new Set<string>();
  const mountProbeRenderer = (label: string) => ({
    type: `gate-probe-${label}`,
    component: function GateProbe() {
      React.useEffect(() => {
        mounts.add(label);
      }, []);
      return <span>{`gate-${label}`}</span>;
    },
  });
  return { mounts, mountProbeRenderer };
}

describe('framework node meta projection gate (visible/hidden/when -> no render, no mount)', () => {
  it('suppresses rendering and mounting for visible:false, hidden:true, and when:false plain nodes', async () => {
    const { mounts, mountProbeRenderer } = createMountRegistry();
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      mountProbeRenderer('invisible'),
      mountProbeRenderer('hidden'),
      mountProbeRenderer('whenfalse'),
      mountProbeRenderer('control'),
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://meta-projection-gate.json"
        schema={{
          type: 'page',
          body: [
            { type: 'gate-probe-invisible', visible: false },
            { type: 'gate-probe-hidden', hidden: true },
            { type: 'gate-probe-whenfalse', when: false },
            { type: 'gate-probe-control' },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('gate-control')).toBeTruthy());

    expect(screen.queryByText('gate-invisible')).toBeNull();
    expect(screen.queryByText('gate-hidden')).toBeNull();
    expect(screen.queryByText('gate-whenfalse')).toBeNull();
    expect(mounts.has('control')).toBe(true);
    expect(mounts.has('invisible')).toBe(false);
    expect(mounts.has('hidden')).toBe(false);
    expect(mounts.has('whenfalse')).toBe(false);
    expect(document.body.textContent?.includes('gate-invisible')).toBe(false);
  });
});
